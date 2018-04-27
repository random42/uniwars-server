const db = require('../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const namespace = require('./socket.io/game');
const mm = require('./matchmaking');
const Utils = require('./utils');
const MAX_QUESTIONS_RECORD = 300;
const QUESTIONS_NUM = 5;
const JOIN_TIMEOUT = 100; // ms
const START_TIMEOUT = 5000; //
const QUESTION_TIMEOUT = 10000; // 10 seconds for each answer after client received question

/*
{
  _id: '',
  players: [{_id, side: 0, index: -1, correct, incorrect}],
  type: 'solo',
  status: null,
  teams: []
}
*/

class Game {
  constructor({_id, side0, side1, type, teams}) {
    // if _id is present the game gets fetched from database
    if (_id) {
      return new Promise((res,rej) => {
        db.games.findOne(_id).then((game) => {
          if (!game) throw new Error("Game does not exist")
          game = Utils.stringifyIds(game);
          for (let i in game) {
            this[i] = game[i]
          }
          res(this)
        }).catch(err => rej(err))
      })
    }
    // else the game is created
    this._id = monk.id().toString();
    this.type = type;
    this.status = null;
    this.players = [];
    for (let id of side0.concat(side1)) {
      this.players.push({
        _id: id,
        side: id in side0 ? 0 : 1,
        index: -1, // current question index
        correct: [],
        incorrect: []
      })
    }
    if (teams) this.teams = teams;
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
    this.emit('new_game',this._id);
    // setting timeout of 'join' event
    this.joinTimeout = setTimeout(this.cancel,JOIN_TIMEOUT);
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
  }

  async start() {
    try {
      this.status = 'play';
      console.log('Starting game')
      let ops = await this.createQuestions()
      this.created_at = Date.now();
      // pushing into the db
      await db.games.insert(this);
      // let's not inform the client about the questions' _ids
      // sending start_game event
      this.emit('start_game',{
        ...this,
        questions: undefined,
      });
      // set timeout for emitting first question
      setTimeout(() => {
        this.emit('question',)
      },START_TIMEOUT)
    } catch(err) {
      console.log(err)
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

  async answer({user,answer}) {
    let player = this.getPlayer(user);
    if (!player) return
    let questions = this.questions;
    // checks the user has a question to answer
    if (index < 0 || index === questions.length) return
    // clears question timeout
    clearTimeout(q_timeouts.get(user));
    let oldQuestion = questions[player.index];
    // checks answer
    let correct = answer === oldQuestion.correct_answer ? 'correct' : 'incorrect';
    player.index++
    // update database
    await db.games.findOneAndUpdate({
      _id: this._id,
      players: {_id: user}
    },{
      // increment questions' index
      $inc: {
        'players.$.index': 1
      },
      // push answer
      $push: {
        ['players.$.'+correct]: {
          question: monk.id(question._id),
          answer
        }
      }
    })
    if (player.index < questions.length) {
      this.sendQuestion(player,player.index);
    } else {
      this.isOver() && this.end()
    }
  }

  sendQuestion(player,index) {

  }

  connected() {
    let arr = [];
    for (let p of this.players) {
      if (namespace.connections.get(p._id) arr.push(p._id)
    }
    return arr;
  }

  getPlayer(_id) {
    return Utils.findObjectById(this.players,_id)
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

  async end() {
    let time = Date.now();
    let players = this.players;
    let questions = this.questions.map(q => q._id)
    let stats = this.getStats();
    console.log("Stats\n",stats);
    // fetch users
    let users = await db.users.find({
      _id: {$in: players.map(p => p._id)}
    },['perf','private']);
    users = JSON.parse(JSON.stringify(users));
    let side0 = users.filter(u => u._id in game.side0)
    let side1 = users.filter(u => u._id in game.side1)
    // calc new ratings
    let newRatings
    if (game.type === 'solo') {
      let a = {_id: side0[0]._id,...RATING_DEFAULT, ...side0[0].perf}
      let b = {_id: side1[0]._id,...RATING_DEFAULT, ...side1[0].perf}
      console.log('side0 perf:',a)
      console.log('side1 perf:',b)
      newRatings = Ratings.soloMatch(a,b,result);
    } else {
      // TODO SQUAD
    }
    // new stats
    let newStats = getNewStats(stats.players,users);
    console.log('New stats:\n',newStats)
    // questions object ids
    let q_oids = questions.map(q => monk.id(q));
    // update database
    let usersUpdate = users.map(u => {
      let p = u._id;
      let resultField
      if (stats.result === 0.5) resultField = 'draws'
      else if ((stats.result === 1 && p in game.side0) || (stats.result === 0 && p in game.side1))
        resultField = 'wins'
      else resultField = 'losses'
      return db.users.findOneAndUpdate(p,{
        $push: {
          // pushing questions to last_questions
          'private.last_questions': {
            $each: q_oids,
            // maintains a limited number of questions' records
            $slice: -MAX_QUESTIONS_RECORD
          },
          // pushing old rating
          'activity.$[last_activity].ratings': u.perf.rating
        },
        $set: {
          // add hit miss stats
          stats: newStats[p],
          // change rating
          perf: newRatings[p]
        },
        // add win/loss/draw to games[type]
        $inc: {
          ['games.'+game.type+resultField]: 1,
          ['activity.$[last_activity].games.'+game.type]: 1
        },
      },
      // filters array to get the current activity
      {arrayFilters: [{"last_activity": {'interval.end': {$exists: false}}}]})
    })
    let gameUpdate = db.games.findOneAndUpdate(game._id,{
      $set: {
        result: stats.result,
        status: 'ended',
        ended_at: Date.now()
      }
    })
    await Promise.all(usersUpdate.concat([gameUpdate]))
    namespace.in(game._id).emit('end_game',{_id: game._id,...stats});
  }
}

// games waiting for start
Game.GAMES = new Map()
// question timeouts indexed by user _id
Game.Q_TIMEOUTS = new Map()

module.exports = Game
