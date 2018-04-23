const MAX_MSG_LENGTH = 1024;
const db = require('../../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const io = require('./io');
const mm = require('../matchmaking');
const Game = require('../game-model');
const utils = require('../game');
const ratings = require('./ratings')
const MAX_QUESTIONS_RECORD = 300;
const QUESTIONS_NUM = 10;
const JOIN_TIMEOUT = 100;
const START_TIMEOUT = 1000;
const QUESTION_TIMEOUT = 10000; // 10 seconds after client received question
const RATING_DEFAULT = {
  rating : 1500,
  rd : 100,
  vol : 0.06
}
// question timeouts indexed by user _id
let q_timeouts = {}

let gameIO = io.of('/game');
gameIO.connections = {}; // sockets indexed by user_id

gameIO.on('connection',postAuthenticate);
gameIO.on('disconnect',(socket) => {
  delete gameIO.connections(socket.user_id);
})

// gameIO namespace post authenticate fn
async function postAuthenticate(socket) {
  if (!socket.auth) return socket.disconnect();
  let user = socket.user_id;
  socket.use((packet,next) => {
    console.log(packet);
    let events = ['answer'];
    // if (packet.event in events) {
    // }
    return next();
  })
  gameIO.connections[user] = socket;
  //EVENTS
  socket.on('search',(type) => {
    mm[type] && mm[type].push(user)
  });
  socket.on('stop_search',(type) => {
    mm[type] && mm[type].pull(user);
  })

  // after new_game event emitted
  socket.on('join',(game_id) => {
    Game.GAMES[game_id] && Game.GAMES[game_id].join(user);
  })
  socket.on('answer',async ({answer,game},cb) => {
    // checks if user is in game
    if (!(game in socket.rooms) || game === socket.id) return
    // gets game
    let g = await db.games.findOne(game);
    let questions = g.questions;
    let index = g.players[user].index;
    // checks validity of question index
    if (index < 0 || index === questions.length) return
    // clears question timeout
    clearTimeout(q_timeouts[user]);
    let question = questions[index];
    // checks answer
    let correct = answer === question.correct_answer;
    index++
    let field = 'players.'+user;
    // update database
    g = await db.games.findOneAndUpdate(game,{
      $inc: {
        [field + '.index']: 1
      },
      $push: {
        [correct ? field + '.correct_answers' : field + '.incorrect_answers']: {
          question: question._id,
          answer
        }
      }
    })
    // if there are more questions sends next one
    if (index < questions.length) {
      sendQuestion({user,question: questions[index]});
    } else { // else checks for game end
      isGameOver(g) && endGame(g)
    }
  })
}

// game is the object
function isGameOver(game) {
  let length = game.questions.length;
  let players = game.players;
  let sum = 0;
  let max = length * Object.keys(players).length;
  for (let i in players) {
    sum += players[i].index
  }
  return sum === max
}


async function endGame(game) {
  // converting oid to string
  game = JSON.parse(JSON.stringify(game));
  let players = game.players;
  let questions = game.questions;
  let side0_points = 0, side1_points = 0
  for (let q of questions) {
    q.hit = 0;
    q.miss = 0;
  }
  // adding hit and miss
  for (let p of players) {
    p.stats = {};
    for (let q of questions) {
      // initialize stats category
      if (!p.stats[q.category]) p.stats[q.category] = {hit: 0, miss: 0}
      // add hit or miss to question and player
      if (q._id in p.correct_answers.map(x => x.question)) {
        // add point to side
        p._id in game.side0 ? side0_points++ : side1_points++
        q.hit++
        p.stats[q.category].hit++
      } else {
        q.miss++
        p.stats[q.category].miss++
      }
    }
  }
  // saving result
  let result;
  if (side0_points > side1_points) {
    result = 1
  } else if (side0_points < side1_points) {
    result = 0
  } else {
    result = 0.5
  }
  // new ratings
  let users = await db.users.find({
    _id: {$in: Object.keys(players)}
  },['perf']);
  users = JSON.parse(JSON.stringify(users));
  let side0 = users.filter((u) => {
    return u._id in game.side0
  })
  let side1 = users.filter((u) => {
    return u._id in game.side1
  })
  switch (game.type) {
    case 'solo' : {
      let a = {...RATING_DEFAULT, ...side0[0].perf}
      let b = {...RATING_DEFAULT, ...side0[1].perf}
      console.log('side0 perf:'a)
      console.log('side1 perf:'b)
      ratings.soloMatch(a,b,result);
      
    }
    case 'squad' : {
      // TODO
    }
  }
}

async function loseQuestion({game,user,question}) {
  let field = 'players.'+user;
  let g = await db.games.findOneAndUpdate(game,{
    $inc: {
      [field + '.index']: 1,
    },
    $push: {
      [field + '.incorrect_answers']: {
        question, answer: null
      }
    }
  });
  if (g.players[user].index < g.questions.length) {
    sendQuestion({user,question: g.questions[g.players[user].index]})
  } else {
    isGameOver(g) && endGame(g)
  }

}

// question is the object
function sendQuestion({user,question}) {
  gameIO.connections[user].emit('question',question,function(succ) {
    // callback when client displayed question
    console.log('Question received by',user)
    // lose question after tot seconds
    q_timeouts[user] = setTimeout(loseQuestion,QUESTION_TIMEOUT,{game,user,question: question._id})
  })
}



module.exports = gameIO;
