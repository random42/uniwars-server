const MAX_MSG_LENGTH = 1024;
const db = require('../../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const io = require('./io');
const mm = require('../matchmaking');
const Game = require('../game-model');
const utils = require('../game');
const ratings = require('../ratings')
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
  let time = Date.now();
  // converting oid to string
  game = JSON.parse(JSON.stringify(game));
  let players = Object.keys(game.players);
  let questions = game.questions.map(q => q._id)
  let stats = getStats(game);
  console.log("Stats\n",stats);
  // fetch users
  let users = await db.users.find({
    _id: {$in: players}
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
    newRatings = ratings.soloMatch(a,b,result);
  } else {
    // TODO SQUAD
  }
  // new stats
  let newStats = getNewStats(stats.players,users);
  console.log('New stats:\n',newStats)
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
        perf: newRatings[p]
      },
      // add win/loss/draw to games[type]
      $inc: {
        ['games.'+game.type+resultField]: 1
        ['activity.$[last_activity].games.'+game.type]: 1
      },
    },{arrayFilters: [{"last_activity": {'interval.end': {$exists: false}}}]})
  })
  let gameUpdate = db.games.findOneAndUpdate(game._id,{
    $set: {
      result: stats.result,
      stats: 'ended',
      ended_at: Date.now()
    }
  })
  await Promise.all(usersUpdate.concat([gameUpdate]))
  namespace.in(game._id).emit('end_game',{_id: game._id,...stats});
}

function getNewStats(stats, users) {
  let old = {}
  for (let i in users) {
    old[users[i]._id] = users[i].stats;
  }
  for (let player in stats) {
    for (let category in stats[player]) {
      let newStat = stats[player][category]
      let found = false;
      for (let i in old[player]) {
        let stat = old[player][i]
        if (stat.category === category) {
          stat.hit += newStat.hit
          stat.miss += newStat.miss
          found = true;
          break;
        }
      }
      !found && old[player].push({category,hit: newStat.hit, miss: newStat.miss})
    }
  }
  return old;
}

// called in endGame
function getStats(game) {
  let stats = {};
  stats.questions = {};
  stats.players = {};
  let players = game.players;
  let questions = game.questions;
  for (let i in players) {
    stats.players[i] = {}
  }
  for (let i in questions) {
    stats.questions[questions[i]._id] = {hit: 0, miss:0}
  }
  // questions' points that decide result
  let side0_points = 0, side1_points = 0
  // adding hit and miss
  for (let p in players) {
    stats.players[p] = {}
    let playerStats = stats.players[p]
    let player = players[p];
    for (let q in questions) {
      let question = questions[q];
      if (!playerStats[question.category]) playerStats[question.category] = {hit: 0,miss: 0}
      // add hit or miss to question and player
      if (question._id in p.correct_answers.map(x => x.question)) {
        // add point to side
        p in game.side0 ? side0_points++ : side1_points++
        stats.questions[question._id].hit++
        playerStats[question.category].hit++
      } else {
        stats.questions[question._id].miss++
        playerStats[question.category].miss++
      }
    }
  }
  // saving result
  if (side0_points > side1_points) {
    stats.result = 1
  } else if (side0_points < side1_points) {
    stats.result = 0
  } else {
    stats.result = 0.5
  }
  return stats
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
