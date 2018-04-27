const MAX_MSG_LENGTH = 1024;
const db = require('../../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const io = require('./io');
const mm = require('../matchmaking');
const Game = require('../game-model');
const Utils = require('../utils');
const Ratings = require('../ratings')
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


let gameIO = io.of('/game');
gameIO.connections = new Map() // sockets indexed by user_id

gameIO.on('connection',postAuthenticate);
gameIO.on('disconnect',(socket) => {
  gameIO.connections.delete(socket.user_id);
})

// gameIO namespace post authenticate fn
async function postAuthenticate(socket) {
  let user = socket.user_id;
  socket.use((packet,next) => {
    console.log(packet);
    let events = ['answer'];
    // if (packet.event in events) {
    // }
    return next();
  })
  gameIO.connections.set(user, socket);
  //EVENTS
  socket.on('search',(type) => {
    mm[type] && mm[type].push(user)
  });
  socket.on('stop_search',(type) => {
    mm[type] && mm[type].pull(user);
  })

  // after new_game event emitted
  socket.on('join',(game_id) => {
    Game.GAMES.has(game_id) && Game.GAMES.get(game_id).join(user);
  })

  socket.on('answer',async ({answer,game},cb) => {
    // checks if user is in game
    if (!(game in socket.rooms) || game === socket.id) return
    // gets game
    let game = await new Game({_id: game})
    game.answer({user,answer})
  })
}


async function endGame(game) {
  let time = Date.now();
  let players = game.players;
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

/* db model -> {
  players: [{
    _id: '',
    points: 5,
    side: 0/1,
    perf: {
      rating: 1234,
      rd: 1,
      vol: 0.06
    },
    stats: {
      "Engineering" : {
        hit: 1,miss: 1
      }
    }
  }
  questions: [{
    _id: '',
    hit: 1,
    miss: 1
  }],
  result: 1
}
*/
function gameStats(game) {
  let stats = {};
  stats.questions = []
  stats.players = []
  let players = game.players;
  let questions = game.questions;
  // questions' points that decide result
  let side0_points = 0, side1_points = 0
  // adding hit and miss
  for (let p in players) {
    let playerStats = {_id: p,points: 0,side: p in game.side0 ? 0 : 1,stats: {}}
    let length = stats.players.push(playerStats);
    let player = players[p];
    for (let q in questions) {
      let question = questions[q];
      let
      // add hit or miss to question and player
      if (question._id in p.correct_answers.map(x => x.question)) {
        // add point to side
        playerStats.side ? side1_points++ : side0_points++
        playerStats.points++
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



module.exports = gameIO;
