const db = require('../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const namespace = require('./socket.io/game');
const mm = require('./matchmaking');
const utils = require('./game');
const MAX_QUESTIONS_RECORD = 300;
const QUESTIONS_NUM = 2;
const JOIN_TIMEOUT = 100; // ms
const START_TIMEOUT = 1000; //
const QUESTION_TIMEOUT = 10000; // 10 seconds for each answer after client received question

class Game {
  constructor(side0, side1, type, teams) {
    this._id = monk.id().toString();
    this.type = type;
    this.side0 = side0; // array of players' indexes
    this.side1 = side1;
    this.status = null;
    this.players = {};
    for (let p of side0.concat(side1)) {
      this.players[p] = {
        index: -1, // current question index
        correct_answers: [],
        incorrect_answers: []
      }
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
    Game.GAMES[this._id] = this;
    this.status = 'create';
    // array of players who emitted 'join' message
    this.joined = [];
    // creating game room
    for (let i in this.players) {
      namespace.connections[i].join(this._id);
    }
    // emitting new_game message
    this.emit('new_game',this._id);
    // setting timeout of 'join' event
    this.joinTimeout = setTimeout(this.cancel,JOIN_TIMEOUT);
    return this;
  }

  join(user_id) {
    if (!(user_id in this.players)) return
    else {
      let length = this.joined.push(user_id);
      // if all players have joined
      if (length === this.side0.length + this.side1.length) {
        // start game
        clearTimeout(this.joinTimeout);
        // delete game from RAM, from now on all read and write is from db
        delete Game.GAMES[this._id]
        utils.start(this);
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

  cancel() {
    console.log('Canceling game',this._id);
    // sending cancel_game event
    this.emit('cancel_game',this._id);
    // deleting room
    for (let i in this.players) {
      namespace.connections[i] &&
      namespace.connections[i].leave(this._id);
    }
    // putting joined users back in the matchmaker
    mm[this.type].push(this.joined);
    // delete game
    delete Game.GAMES[this._id]
  }

  emit(ev, ...message) {
    namespace.in(this._id).emit(ev,...message);
  }

  emitToSide(side,ev,...message) {
    for (let player of this['side'+side]) {
      namespace.connections[player].emit(ev,...message);
    }
  }

  connected() {
    let arr = [];
    for (let id in this.players) {
      if (namespace.connections[id]) arr.push(id)
    }
    return arr;
  }
}

Game.GAMES = {}
module.exports = Game
