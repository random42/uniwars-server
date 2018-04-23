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
// question timeouts indexed by user _id
let q_timeouts = {}

async function start(game) {
  try {
    game.status = 'play';
    console.log('Starting game')
    let _id = game._id;
    let token = monk.id().toString();
    let ops = await Promise.all([game.createQuestions(),
      bcrypt.hash(token,10)])
    game.token = ops[1]
    game.created_at = Date.now();
    // pushing into the db
    await db.games.insert(game);
    // let's not inform the client about the questions' _ids
    // sending start_game event
    game.emit('start_game',{game: {
      ...game,
      token: undefined,
      questions: undefined,
    },token});
  } catch(err) {
    console.log(err)
  }
}

function joinRoom(players,room) {
  for (let id of players) {
    namespace.connections[id] &&
    namespace.connections[id].join(room);
  }
}

function leaveRoom(players,room) {
  for (let id of players) {
    namespace.connections[id] &&
    namespace.connections[id].leave(room);
  }
}

async function checkToken(_id,token) {
  let game = await db.games.findOne(_id);
  if (!game) return false
  let right = await bcrypt.compare(token,game.token);
  return right;
}

module.exports = {
}
