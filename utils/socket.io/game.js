const db = require('../../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const io = require('./io');
let nsp = io.of('/game');
module.exports = nsp;
nsp.connections = new Map()
nsp.postAuthenticate = postAuthenticate
const mm = require('../matchmaking');
const GameClasses = require('../game');
const Utils = require('../utils');

// game namespace post authenticate fn
async function postAuthenticate(socket) {
  let user = socket.user_id;
  socket.use((packet,next) => {
    //console.log(packet);
    next();
    // packet is array [event,...message]
  })
  //EVENTS
  socket.on('search',(type) => {]
    mm[type] && mm[type].push(user)
  });
  socket.on('stop_search',(type) => {
    mm[type] && mm[type].pull(user)
  })

  // after new_game event emitted
  socket.on('join',(game_id) => {
    Game.GAMES.has(game_id) && Game.GAMES.get(game_id).join(user);
  })

  socket.on('answer', async({answer, question, game}) => {
    // checks if user is in game
    if (!(game in socket.rooms) || game === socket.id) return
    // gets game
    let g = await fetchGame(game);
    
    g.answer({user, question, answer})
  })
}


async fetchGame(_id) {
  return db.games.findOne(_id);
}
