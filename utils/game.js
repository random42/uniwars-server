const MAX_MSG_LENGTH = 1024;
const db = require('../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const io = require('./io');
let game = io.of('/game');
game.connections = {}; // sockets indexed by user_id
game.postAuthenticate = postAuthenticate;


// game namespace post authenticate fn
async function postAuthenticate(socket) {
  game.connections[socket.user_id] = socket;
  socket.on('disconnect',(socket) => {
    delete game.connections(socket.user_id);
  })
}

module.exports = {};
