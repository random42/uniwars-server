const db = require('../../db');
const monk = require('monk');
const namespace = require('../socket/game');
const mm = require('../matchmaking');
const Rating = require('../ratings');
const Utils = require('../utils');
const debug = require('debug')('game');
const Maps = require('./maps');

const MAX_QUESTIONS_RECORD = 300;
const QUESTIONS_NUM = 5;
const JOIN_TIMEOUT = 100; // ms
const START_TIMEOUT = 1000; //
const QUESTION_TIMEOUT = 10000; // 10 seconds for each answer after client received question

/*
{
  _id: '',
  players: [{_id,
            side: 0 | 1,
            index: 0,
            correct: [{question: _id, answer: string}],
            incorrect: as correct,
            picture,
            username,
            perf}],
  type: 'solo',
  status: null, create/play/end
  teams: [{_id, side, perf, name, picture}]
}
*/

class Game {

  // creates players array and _id or copies argument if _id is present
  constructor({_id, side0, side1, type }) {
    // if _id is present the game was fetched from database
    if (_id) {
      let game = arguments[0];
      for (let i in game) {
        this[i] = game[i];
      }
      this.stringify();
      return;
    }
    // else a new game is created from the other params
    this._id = monk.id().toString();
    this.status = null;
    this.players = [];
    this.type = type;
    // next line assures that side0 is [0,length/2] and side1...
    for (let id of side0.concat(side1)) {
      this.players.push({
        _id: id,
        side: side0.indexOf(id) >= 0 ? 0 : 1,
        index: 0, // current question index
        correct: [],
        incorrect: []
      })
    }
  }

  /*
    fetch users details and create questions

  */
  async init() {
    let ops = []
    let getUsers = db.users.find({
      _id: {$in: this.players.map(p => p._id)}
    },['username','perf','picture'])
    .then((users) => {
      for (let u of users) {
        let player = this.getPlayer(u._id.toString());
        player.perf = u.perf;
        player.picture = u.picture;
        player.username = u.username;
      }
    });
    ops.push(getUsers);
    ops.push(this.createQuestions());
    return Promise.all(ops)
  }

  // fetch game from db
  async fetch() {
    let game = await db.games.findOne(this._id);
    if (!game) throw new Error("Game does not exist")
    game = Utils.stringifyIds(game);
    for (let i in game) {
      this[i] = game[i]
    }
    return this;
  }

  // return undefined if at least one player is not connected
  // else return this
  create() {
    // checks all players are connected, if not...
    // pushes all connected players back into the matchmaker
    let conns = this.connected();
    if (conns.length < this.players.length) {
      mm[this.type].push(conns);
      debug(this._id, 'Not all players are connected');
      return;
    }
    // keep the game in memory
    Maps.starting.set(this._id,this);
    this.status = 'create';
    // array of players who emitted 'join' message
    this.joined = [];
    // creating game room
    for (let p of this.players) {
      // player connection has been checked before
      // namespace.connections.has(p._id) &&
      namespace.connections.get(p._id).join(this._id);
    }
    // emitting new_game message
    this.emit('new_game', this._id, this.type);
    // game gets canceled if at least one player does not join
    this.joinTimeout = setTimeout(() => this.cancel(), JOIN_TIMEOUT);
    return this;
  }

  // starts game if all players joined
  join(user_id) {
    if (this.status !== 'create' || // wrong status
      !this.isPlayer(user_id) || // wrong player
      // player has joined yet
      this.joined.indexOf(user_id) >= 0) return
    else {
      let length = this.joined.push(user_id);
      // if all players have joined
      if (length === this.players.length) {
        // start game
        clearTimeout(this.joinTimeout);
        delete this.joined;
        delete this.joinTimeout;
        // delete game from RAM,
        // from now on all read and write is done in db
        Maps.starting.delete(this._id)
        this.start();
      }
    }
  }

  async createQuestions() {
    // query last questions from users
    let last_questions = await db.users.aggregate([
      {$match: {_id: {$in: Object.keys(this.players)}}},
      {$unwind: "$private.last_questions"},
      {$group: {
        _id: "$private.last_questions",
        users: {
          $addToSet: "$_id"
        }
      }}
    ]);
    // query a sample of questions that don't match with users' last questions
    this.questions = await db.questions.aggregate([
      {$match: {
        _id: {$nin: last_questions.map(q => q._id)}
      }},
      {$sample: {size: QUESTIONS_NUM}},
    ]);
    // couldn't quite do it with one aggregation pipeline
  }

  async start() {
    try {
      this.status = 'play';
      debug('Start', this._id);
      Maps.q_timeouts.set(this._id, new Map());
      // fetch users details, creates questions
      await this.init()
      this.created_at = Date.now();
      // pushing into the db
      await db.games.insert(this);
      // let's not inform the client about the questions' _ids
      // sending start_game event
      this.stringify();
      this.emit('start_game',{
        ...this,
        questions: undefined,
      });
      // set timeout for emitting first question
      setTimeout(() => {
        for (let p of this.players) {
          this.sendQuestion(p._id)
        }
      }, START_TIMEOUT)
    } catch(err) {
      console.log(err)
    }
  }

  // if not all players have joined
  cancel() {
    if (this.status !== 'create') return
    debug('Canceling game', this._id);
    // sending cancel_game event
    // this.emit('cancel_game',this._id);
    // deleting room
    for (let p of this.players) {
      namespace.connections.has(p._id) &&
      namespace.connections.get(p._id).leave(this._id);
    }
    // putting joined users back in the matchmaker
    mm[this.type].push(this.joined);
    // delete game
    Maps.starting.delete(this._id)
  }

  emit(ev, ...message) {
    namespace.in(this._id).emit(ev,...message);
  }

  emitToSide(side, ev, ...message) {
    for (let player of this.players) {
      player.side === side && namespace.connections.get(player._id).emit(ev,...message);
    }
  }

  emitToPlayer(id, ev, ...message) {
    namespace.connections.has(id) &&
    namespace.connections.get(id).emit(ev, ...message)
  }


  async answer({user, question, answer}) {
    console.time('answer');
    let player = this.getPlayer(user);
    if (!player) return Promise.reject("Wrong player");
    let questions = this.questions;
    // if the user has no more questions
    if (player.index === questions.length) return Promise.reject("No more questions");
    let realQuestion = questions[player.index];
    // wrong question
    if (question !== realQuestion._id) return Promise.reject("Wrong question");
    debug(JSON.stringify(arguments[0]));
    // clears question timeout
    clearTimeout(Maps.q_timeouts.get(this._id).get(user));
    // checks answer
    let correct = answer === realQuestion.correct_answer ? 'correct' : 'incorrect';
    // modifies the object too in case game ends
    player.index++
    player[correct].push({question, answer})
    // update game database
    return db.games.findOneAndUpdate({
      _id: this._id,
      'players._id': monk.id(user)
    },{
      // increment questions' index
      $inc: {
        'players.$.index': 1
      },
      // push answer
      $push: {
        ['players.$.'+correct]: {
          question: monk.id(question),
          answer
        }
      }
    }).then(() => console.timeEnd('answer'));
    // checks if game is over
    if (player.index === questions.length && this.isOver())
      return this.end()
    // SQUAD
    if (this.type !== 'solo') {
      this.emitToSide(player.side,'mate_answer',{
        user: player._id,
        question: realQuestion._id,
        answer
      })

      // if all side's players answered, send next question
      let all = true;
      let start = player.side ? half_length : 0
      let length = this.players.length
      for (let i = start; i < length && all; i++) {
        if (this.players[i].index !== player.index) {
          all = false;
        }
      }
      if (all) {
        this.players.forEach((p) => {
          this.sendQuestion(p)
        })
      }
    }
  }

  sendQuestion(user) {
    let player = this.getPlayer(user);
    // don't send if player has answered all questions
    if (player.index >= this.questions.length) return
    // else
    let _id = player._id;
    let question = this.questions[player.index];
    this.emitToPlayer(_id, 'question', question);
    // sets question timeout
    Maps.q_timeouts.get(this._id).set(_id,
      setTimeout(() => {
        this.answer({user: _id, question: question._id, answer: null})
      }, QUESTION_TIMEOUT))
  }

  connected() {
    let arr = [];
    for (let p of this.players) {
      if (namespace.connections.has(p._id)) {
        arr.push(p._id)
      }
    }
    return arr;
  }

  getPlayer(_id) {
    let p = Utils.findObjectById(this.players,_id)
    return p
  }

  isPlayer(_id) {
    return Utils.findIndexById(this.players,_id) > -1
  }

  isOver() {
    let questions = this.questions.length;
    let players = this.players;
    let sum = 0;
    let max = questions * players.length;
    for (let p of players) {
      sum += p.index
    }
    return sum === max
  }

  /*
  {
    players: [{
      _id: '',
      points: 1,
      stats: [{
        category: "Engineering",
        hit: 1,
        miss: 1
      }]
    }],
    questions: [{
      _id: '',
      hit: 1,
      miss: 10
    }],
    result: 1
  }
  */
  getStats(users) { // arguments are fresh db data
    let half_length = this.players.length / 2
    let stats = {},
    side0_points = 0,
    side1_points = 0
    // getting sides' points, adding user
    stats.players = this.players.map((p) => {
      let u = Utils.findObjectById(users, p._id)
      let points = p.correct.length
      let side = p.side
      if (side === 0) {
        side0_points += points
      } else {
        side1_points += points
      }
      return {
        _id: p._id,
        side,
        points,
        stats: u.stats || []
      }
    });
    stats.questions = this.questions.map((q) => {
      return {
        _id: q._id,
        hit: 0,
        miss: 0
      }
    })
    // calculating hit miss for each player's category and each question
    for (let q in this.questions) {
      let question = this.questions[q]
      let q_stats = stats.questions[q]
      for (let p in this.players) {
        let player = this.players[p]
        let p_stats = stats.players[p]
        let category = Utils.findObjectByKey(p_stats.stats, 'category', question.category)
        if (!category) {
          category = {category: question.category, hit: 0, miss: 0}
          p_stats.stats.push(category)
        }
        if (Utils.findObjectByKey(player.correct, 'question', question._id)) {
          category.hit++
          q_stats.hit++
        } else {
          category.miss++
          q_stats.miss++
        }
      }
    }
    // result
    if (side0_points === side1_points) {
      stats.result = 0.5
    } else if (side0_points > side1_points) {
      stats.result = 1
    } else {
      stats.result = 0
    }
    this.result = stats.result;
    return stats;
  }

  async end() {
    debug('Ending game')
    debug(JSON.stringify(this, null, 3));
    console.time('end')
    // delete q_timeouts reference
    Maps.q_timeouts.delete(this._id);
    let players = this.players;
    let questions = this.questions;
    // fetch users_doc
    let users_doc = await db.users.find({
      _id: {$in: players.map(p => p._id)}
    },['private.last_questions','stats']);
    users_doc = Utils.stringifyIds(users_doc);
    // get new ratings, category hit miss, questions' hit miss
    let stats = this.getStats(users_doc);
    debug('STATS')
    debug(JSON.stringify(stats, null, 3));
    // questions object ids to put in db
    let q_oids = questions.map(q => monk.id(q._id));
    // update database
    let usersUpdate = stats.players.map(p => {
      let u = Utils.findObjectById(users_doc, p._id);
      let resultField;
      if (stats.result === 0.5) resultField = 'draws'
      else if ((stats.result === 1 && !p.side) || (stats.result === 0 && p.side))
        resultField = 'wins'
      else resultField = 'losses'
      let query = {
        _id: p._id,
        /*
        activity: {
          $elemMatch: {
            'interval.end': {$exists: false}
          }
        }
        */
      }
      let update = {
        $push: {
          // pushing questions to last_questions
          // no need of $addToSet as questions cannot match
          'private.last_questions': {
            $each: q_oids,
            // maintains a limited number of questions' records
            $slice: -MAX_QUESTIONS_RECORD
          },

        },
        $set: {
          // add hit miss stats
          stats: p.stats,
        },
        // add win/loss/draw to games[type]
        $inc: {
          ['games.'+this.type+'.' + resultField]: 1,
          //['activity.$.games.' + this.type]: 1
        },
      };
      return db.users.findOneAndUpdate(query,update)
    })
    let gameUpdate = db.games.findOneAndUpdate(this._id,{
      $set: {
        result: stats.result,
        status: 'ended',
        ended_at: Date.now(),
        // keeping only the minimum
        questions: q_oids,
      },
      // not possible in MongoDB 3.4
      $unset: {
        'players.$[].index': "",
        'players.$[].picture': "",
        'players.$[].username': "",
      }
    })
    let questionsUpdate = stats.questions.map(q => {
      return db.questions.findOneAndUpdate(q._id,
        // increment hit and miss
        {$inc: {hit: q.hit,miss: q.miss}})
    })
    await Promise.all(
      [...usersUpdate,...questionsUpdate, gameUpdate, this.updateRatings()]
    )
    console.timeEnd('end');
  }

  // turns every ObjectID to String
  stringify() {
    let g = Utils.stringifyIds(this);
    for (let i in g) {
      this[i] = g[i];
    }
  }

}




module.exports = Game
