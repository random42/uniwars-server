const db = require('../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const namespace = require('./socket.io/game');
const mm = require('./matchmaking');
const MAX_QUESTIONS_RECORD = 300;
const QUESTIONS_NUM = 10;
const JOIN_TIMEOUT = 100; // ms
const START_TIMEOUT = 1000; //
const QUESTION_TIMEOUT = 10000; // 10 seconds for each answer after client received question


class Game {
  constructor(side0, side1, type, teams) {
    this._id = monk.id().toString();
    this.type = type;
    this.side0 = side0; // array of players' indexes
    this.side1 = side1;
    this.players = {};
    for (let p of side0.concat(side1)) {
      this.players[p] = {
        q_index: null, // current question index
        correct_answers: [],
        incorrect_answers: []
      }
    }
    teams && this.teams = teams;
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
    // array of players who emitted 'join' message
    this.joined = [];
    // creating game room
    for (let i in this.players) {
      namespace.connections[i].join(this._id);
    }
    // emitting new_game message
    namespace.in(this._id).emit('new_game',this._id);
    // setting timeout of 'join' event
    this.joinTimeout = setTimeout(this.cancel,JOIN_TIMEOUT);
    return this
  }

  cancel() {
    console.log('Canceling game',this._id);
    // sending cancel_game event
    namespace.in(this._id).emit('cancel_game',this._id);
    // deleting room
    for (let i in this.players) {
      namespace.connections[i] &&
      namespace.connections[i].leave(this._id);
    }
    // putting joined users back in the matchmaker
    mm[game.type].push(this.joined);
  }

  connected() {
    let arr = [];
    for (let id in this.players) {
      if (namespace.connections[id]) arr.push(id)
    }
    return arr;
  }
}

module.exports = Game
