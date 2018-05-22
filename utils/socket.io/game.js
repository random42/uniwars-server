const db = require('../../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const io = require('./io');
const Maps = require('../game/maps');
let nsp = io.of('/game');
module.exports = nsp;
nsp.connections = new Map()
nsp.postAuthenticate = postAuthenticate
const mm = require('../matchmaking');
const Utils = require('../utils');
const gameUtils = require('../game/utils');

// game namespace post authenticate fn
async function postAuthenticate(socket) {
  //socket.setMaxListeners(20);
  let user = socket.user_id;
  socket.use((packet,next) => {
    //console.log(packet);
    next();
    // packet is array [event,...message]
  })
  //EVENTS
  socket.on('search',(type) => {
    mm[type] && mm[type].push(user)
  });
  socket.on('stop_search',(type) => {
    mm[type] && mm[type].pull(user)
  })

  // after new_game event emitted
  socket.on('join',(game_id) => {
    Maps.starting.has(game_id) && Maps.starting.get(game_id).join(user);
  })

  socket.on('answer', async({answer, question, game}) => {
    // checks if user is in game
    if (!(game in socket.rooms) || game === socket.id) return
    // gets game
    let g = await gameUtils.fetch(game);
    g.answer({user, question, answer})
  })
}
