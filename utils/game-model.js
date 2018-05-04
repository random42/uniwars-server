const db = require('../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const namespace = require('./socket.io/game');
const mm = require('./matchmaking');
const Rating = require('./ratings');
const Utils = require('./utils');
const debug = require('debug')('game')
const MAX_QUESTIONS_RECORD = 300;
const QUESTIONS_NUM = 5;
const JOIN_TIMEOUT = 100; // ms
const START_TIMEOUT = 1000; //
const QUESTION_TIMEOUT = 10000; // 10 seconds for each answer after client received question

/*
{
  _id: '',
  players: [{_id, side: 0 | 1, index: 0, correct, incorrect, picture, username, perf}],
  type: 'solo',
  status: null,
  teams: []
}
*/

class Game {
  constructor({_id, side0, side1, type, teams}) {
    // if _id is present the game must be fetched from database
    if (_id) {
      this._id = _id;
      return
    }
    // else the game is created from the other params
    this._id = monk.id().toString();
    this.type = type;
    this.status = null;
    this.players = [];
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
    if (teams) this.teams = teams;
  }

  // fetch users, teams, create questions
  async init() {
    let ops = []
    let getUsers = db.users.find({
      _id: {$in: this.players.map(p => p._id)}
    },['username','perf','picture']).then((users) => {
      for (let u of users) {
        let player = this.getPlayer(u._id.toString());
        player.perf = u.perf;
        player.picture = u.picture;
        player.username = u.username;
      }
    });
    ops.push(getUsers);
    if (this.teams) {
      let teams = db.teams.find({
        _id: {$in: this.teams},
      },
      {
        name: 1,
        picture: 1,
        perf: 1
      }).then(() => {
        this.teams = teams;
      })
      ops.push(teams)
    }
    ops.push(this.createQuestions());
    await Promise.all(ops)
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

  // return false if at least one player is not connected
  create() {
    // checks all players are connected, if not...
    // pushes all connected players into the matchmaker
    let conns = this.connected();
    if (conns.length < this.players.length) {
      mm[this.type].push(conns);
      return false;
    }
    // keep the game in memory
    Game.GAMES.set(this._id,this)
    this.status = 'create';
    // array of players who emitted 'join' message
    this.joined = [];
    // creating game room
    for (let p of this.players) {
      namespace.connections.get(p._id).join(this._id);
    }
    // emitting new_game message
    this.emit('new_game', this._id, this.type);
    // setting timeout of 'join' event
    this.joinTimeout = setTimeout(this.cancel.bind(this),JOIN_TIMEOUT);
    return this;
  }

  join(user_id) {
    if (!this.status === 'create' && !this.isPlayer(user_id)) return
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
        Game.GAMES.delete(this._id)
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
      console.log('Starting game')
      // fetch users and teams docs, creates questions
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
      debug(this)
      // set timeout for emitting first question
      setTimeout(() => {
        for (let p of this.players) {
          this.sendQuestion(p,0)
        }
      }, START_TIMEOUT)
    } catch(err) {
      console.log(err)
    }
  }

  cancel() {
    if (this.status in ['play','end']) return
    console.log('Canceling game',this._id);
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
    Game.GAMES.delete(this._id)
  }

  emit(ev, ...message) {
    namespace.in(this._id).emit(ev,...message);
  }

  emitToSide(side,ev,...message) {
    for (let player of this.players) {
      player.side === side && namespace.connections.get(player._id).emit(ev,...message);
    }
  }

  emitToPlayer(id, ev, ...message) {
    namespace.connections.has(id) &&
    namespace.connections.get(id).emit(ev, ...message)
  }

  async answer({user, question, answer}) {
    debug('Answer',user, answer)
    console.time('answer');
    let player = this.getPlayer(user);
    if (!player) return
    let questions = this.questions;
    // checks if the user has a question to answer
    if (player.index >= questions.length) return
    let realQuestion = questions[player.index];
    // wrong question
    if (question !== realQuestion._id) return
    debug(JSON.stringify(arguments[0]))
    // clears question timeout
    clearTimeout(Game.Q_TIMEOUTS.get(user));
    // checks answer
    let correct = answer === realQuestion.correct_answer ? 'correct' : 'incorrect';
    // modifies the object too in case game ends
    player.index++
    player[correct].push({question, answer})
    // update game database
    await db.games.findOneAndUpdate({
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
    })
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
    // SOLO
    else {

    }
    console.timeEnd('answer');
  }

  sendQuestion(player) {
    // don't send if
    if (player.index >= this.questions.length) return
    // else
    let id = player._id
    let question = this.questions[player.index]
    this.emitToPlayer(id, 'question', question, (succ) => {
      // callback when question is displayed in client
      // setting question timeout
      Game.Q_TIMEOUTS.set(id,
        setTimeout(this.answer.bind(this), QUESTION_TIMEOUT, {user: id, question: question._id, answer: null}))
    })
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
      perf: {
        rating: 1234,
        rd: 123,
        vol: 0.05
      },
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
    teams: [{
    _id: '',
    points: '',
    perf: ''
  }]
    result: 1
  }
  */
  getStats(users, teams) { // arguments are fresh db data
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
        perf: p.perf,
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
    if (this.teams) {
      stats.teams = this.teams.slice();
      stats.teams[0].points = side0_points;
      stats.teams[1].points = side1_points;
    }
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
    // ratings
    let side0, side1, ratings
    if (this.type in ['solo','team']) {
      if (this.type === 'team') {
        side0 = stats.teams[0];
        side1 = stats.teams[1];
      } else {
        side0 = stats.players[0];
        side1 = stats.players[1];
      }
      ratings = Rating.soloMatch(side0, side1, stats.result);
      side0.perf = ratings.side0;
      side1.perf = ratings.side1;
    }
    if (this.type === 'squad') {
      side0 = stats.players.slice(0, half_length);
      side1 = stats.players.slice(half_length, players.length);
      ratings = Rating.squadMatch(side0, side1, stats.result);
      for (let i in stats.players) {
        // copy new perf in stats array
        if (i < half_length) { // side0
          stats.players[i].perf = ratings.side0[i]
        }
        else { // side1
          stats.players[i].perf = ratings.side1[i - half_length];
        }
      }
    }
    return stats;
  }

  async end() {
    debug('Ending game')
    debug(JSON.stringify(this, null, 3));
    console.time('end')
    let players = this.players;
    let questions = this.questions;
    let docs_fetch = [];
    let users_doc, teams_doc = undefined
    // fetch users_doc
    docs_fetch.push(db.users.find({
      _id: {$in: players.map(p => p._id)}
    },['perf','private','stats']));
    if (this.type === 'team') {
      docs_fetch.push(db.teams.find({
        _id: {
          $in: this.teams.map(t => t._id)
        }
      }))
    }
    let docs = await Promise.all(docs_fetch)
    docs = Utils.stringifyIds(docs);
    users_doc = docs[0];
    // get new ratings, category hit miss, questions' hit miss
    let stats = this.getStats(users_doc, teams_doc);
    debug('STATS')
    debug(JSON.stringify(stats, null, 3));
    // questions object ids to put in db
    let q_oids = questions.map(q => monk.id(q._id));
    // update database
    if (this.type === 'team') {
    }
    let usersUpdate = stats.players.map(p => {
      let u = Utils.findObjectById(users_doc, p._id);
      let resultField;
      if (stats.result === 0.5) resultField = 'draws'
      else if ((stats.result === 1 && !p.side) || (stats.result === 0 && p.side))
        resultField = 'wins'
      else resultField = 'losses'
      let query = {
        _id: p._id,
        activity: {
          $elemMatch: {
            'interval.end': {$exists: false}
          }
        }
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
          ['games.'+this.type+'.'+resultField]: 1,
          ['activity.$.games.'+this.type]: 1
        },
      };
      if (this.type !== 'team') {
        // pushing old rating
        update.$push['activity.$.ratings'] = u.perf.rating
        // change rating
        update.$set.perf = p.perf
      }
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
    await Promise.all(usersUpdate.concat([gameUpdate].concat(questionsUpdate)))
    this.emit('end_game',{_id: this._id, ...stats});
    console.timeEnd('end');
  }

  stringify() {
    let g = Utils.stringifyIds(this);
    for (let i in g) {
      this[i] = g[i];
    }
  }
}

class TeamGame extends Game {

}

// games waiting for start
Game.GAMES = new Map()
// question timeouts indexed by user _id
Game.Q_TIMEOUTS = new Map()

module.exports = Game
