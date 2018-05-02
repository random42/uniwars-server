const MAX_MSG_LENGTH = 1024;
const db = require('../../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const io = require('./io');
const mm = require('../matchmaking');
const Game = require('../game-model');
const Utils = require('../utils');


let nsp = io.of('/game');

nsp.connections = new Map()

nsp.postAuthenticate = postAuthenticate

// game namespace post authenticate fn
async function postAuthenticate(socket) {
  let user = socket.user_id;
  socket.use((packet,next) => {
    console.log(packet);
    let events = ['answer'];
    // if (packet.event in events) {
    // }
    return next();
  })
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

  socket.on('answer',async ({answer,game}) => {
    // checks if user is in game
    if (!(game in socket.rooms) || game === socket.id) return
    // gets game
    let g = await new Game({_id: game})
    g.answer({user,answer})
  })
}

module.exports = nsp;
