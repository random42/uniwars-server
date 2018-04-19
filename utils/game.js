const db = require('../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const namespace = require('./socket.io/game');
const mm = require('./matchmaking');
const MAX_QUESTIONS_RECORD = 300;
const QUESTIONS_NUM = 10;
const JOIN_TIMEOUT = 100; // ms
const START_TIMEOUT = 1000;
const QUESTION_TIMEOUT = 10000; // 10 seconds for each answer after client received question
let startingGames = {};

function onSearch(socket,{type}) {
  mm[type].push(socket.user_id);
}

function onStopSearch(socket,{type}) {
  mm[type].pull(socket.user_id);
}

async function sendNextQuestion(_id,user) {
  let game = await db.games.findOneAndUpdate(_id,{
    $inc: {
      ('players.'+user+'.index'): 1,
    }
  });
  let question = await db.questions.findOne({
    _id: game.questions[game.players[user].index-1]
  })
  namespace.to(user).emit('question',question,function(succ) {
    // callback when user received question
    if (!succ) {
      console.log('sendNextQuestion',err);
      return;
    }
    // lose question after tot seconds
    setTimeout(() => {

    })
  });
  console.log(question);
}

function questionTimeout() {

}

// 'join_game' event
async function onJoin(socket,_id) {
  try {
    let user = socket.user_id
    console.log('User',socket.user,'trying to join');
    if (!(_id in socket.rooms) || _id === socket.id) return // game was cancelled
    console.log('User',socket.user,'joined');
    // adding player to joined array
    let game = startingGames[_id]
    game.joined.push(user)
    if (game.joined.length === game.players.length) {
      clearTimeout(game.joinTimeout);
      delete game.joinTimeout;
      delete game.joined;
      startGame(game)
      delete startingGames[_id];
    }
  } catch(err) {
    console.log(err);
  }
}

// 'answer' event
function onAnswer(socket,{answer,game,token,cb}) {
}

//

// all players have joined the game
async function startGame(game) {
  console.log('All players have joined. Starting game')
  console.log(game);
  let _id = game._id;
  let token = monk.id();
  let ops = await Promise.all([createQuestions(game),
    bcrypt.hash(token,10)])
  let questions = ops[0]
  // check if is oid or string
  console.log('Question type',typeof questions[0])
  game.token = ops[1]
  game.questions = questions//.map(q => monk.id(q));
  game.created_at = Date.now();
  let players = {};
  for (let id of game.players) {
    players[id] = {
      index: 0,
      correct_answers: [],
      incorrect_answers: []
    };
  }
  game.players = players;
  game.status = "playing";
  // pushing into the db
  await db.games.insert(game);
  // let's not inform the client about the questions' _ids
  // sending start_game event
  namespace.in(_id).emit('start_game',{game: {
    ...game,
    token: undefined,
    questions: undefined,
  },token});
  // timout for emitting first question
  setTimeout(async () => {
    let question = await db.questions.findOne(questions[0]);
    namespace.in(_id).emit('question',question);
  },START_TIMEOUT)
}

// when not all players have joined
function cancelGame(game) {
  console.log('Canceling game')
  // sending cancel_game event
  namespace.in(game._id).emit('cancel_game',game._id);
  // deleting room
  leaveRoom(game.players,game._id)
  // deleting game obj
  delete startingGames[game._id];
  // putting joined users back in the matchmaker
  mm[game.type].push(game.joined);
}

// called from matchmaker
function createGame({side0,side1,players,type,teams}) {
  let game = {
    _id: monk.id().toString(),
    type,
    side0,
    side1,
    teams
  }
  let _id = game._id;
  let connected = connected(players);
  // checks all players are connected, if not...
  // pushes all connected players into the matchmaker
  if (connected.length < players.length) {
    mm[type].push(connected);
    return
  }
  // array of players who emitted 'join' message
  game.joined = [];
  // saves the game
  startingGames[_id] = game;
  // creating game room
  joinRoom(players,_id)
  // emitting new_game message
  namespace.in(_id).emit('new_game',_id)
  // setting timeout of 'join' event
  game.joinTimeout = setTimeout(cancelGame,JOIN_TIMEOUT,game)
}

async function createQuestions(game) {
  let players = game.players;
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
  // query a sample of questions that don't match with users' last questions
  let questions = await db.questions.aggregate([
    {$match: {
      _id: {$nin: last_questions.map(q => q._id)}
    }},
    {$sample: QUESTIONS_NUM},
    {$project: {_id: 1}}
  ]);
  return questions;
}

// returns array of connected players
function connected(players) {
  let arr = []
  for (let id of players) {
    if (namespace.connections[id]) arr.push(id)
  }
  return arr;
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
  !game && return false;
  let right = await bcrypt.compare(token,game.token);
  return right;
}

module.exports = {
  onJoin,onAnswer,onSearch,createGame,onStopSearch
}
