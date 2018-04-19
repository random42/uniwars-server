const MAX_MSG_LENGTH = 1024;
const db = require('../../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const io = require('./io');
const mm = require('../matchmaking');
const utils = require('../game');

let gameIO = io.of('/gameIO');
gameIO.connections = {}; // sockets indexed by user_id
// gameIO namespace post authenticate fn
async function postAuthenticate(socket) {
  if (!socket.auth) return;
  this.connections[socket.user_id] = socket;
  //EVENTS
  socket.on('search_game',(type) => {
    utils.onSearch(socket,{type})
  })
  socket.on('join_game',(game,token) => {
    utils.onJoin(socket,{game,token})
  })
  socket.on('answer_game',(answer,game,cb) => {
    utils.onAnswer(socket,{answer,game,cb});
  })
}

gameIO.on('connection',postAuthenticate);
gameIO.on('disconnect',function(socket) {
  delete gameIO.connections(socket.user_id);
})



module.exports = gameIO;
