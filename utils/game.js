const db = require('../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const gameSocket = require('./socket.io/game');
const MAX_QUESTIONS_RECORD = 300;
const QUESTIONS_NUM = 10;

const GameUtils = {
  async createGame({players,type,teams}) {
    let token = monk.id();
    let game = {
      _id: monk.id(),
      created_at: Date.now(),
      type,
      players: players.map(p => monk.id(p)),
    };
    if (teams) {
      game.teams = teams;
    }
    let ops = await Promise.all([this.createQuestions(game),
      bcrypt.hash(token,10)])
    let questions = ops[0];
    game.token = ops[1];
    game.questions = questions.map(q => monk.id());
    await db.games.insert(game);
    gameSocket.start(game) ||
    
  },

  async createQuestions(game) {
    let players = game.players;
    if (game.type !== 'solo') {
      players = players[0].concat(players[1]);
    }
    // query last questions from users
    let last_questions = await db.users.aggregate([
      {$match: {_id: {$in: players}}},
      {$unwind: "$private.last_questions"},
      {$group: {
        _id: "$private.last_questions",
        users: {
          $addToSet: "$_id"
        }
      }}
    ]);
    let questions = await db.questions.aggregate([
      {$match: {
        _id: {$nin: last_questions.map(q => q._id)}
      }},
      {$sample: QUESTIONS_NUM},
    ]);
    return questions;
  },
}

module.exports = GameUtils
