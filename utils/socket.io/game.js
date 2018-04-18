const MAX_MSG_LENGTH = 1024;
const db = require('../../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const io = require('./io');
let game = io.of('/game');
game.connections = {}; // sockets indexed by user_id
// game namespace post authenticate fn
async function postAuthenticate(socket) {
  if (!socket.auth) return;
  this.connections[socket.user_id] = socket;
  //EVENTS
  socket.on('search',(type) => {

  })
  socket.on('join',async (game,token) => {

  })
  socket.on('answer',(answer,game,token,cb) => {
    if (!(typeof answer === 'string') || !(game in socket.rooms)) cb(false);
  })
}

game.on('connection',postAuthenticate);
game.on('disconnect',function(socket) {
  delete game.connections(socket.user_id);
})

game.start = function (game) {
  let players = game.type === 'solo' ? players : players[0].concat(players[1]);
  players = players.map(p => p.toString());
  if (!areConnected(players)) return false;
  let room = game._id.toString();
  joinRoom(players,room);
  this.in(room).emit('start',)
}

function areConnected(players) {
  for (let id of players) {
    if (!game.connections[id]) return false;
  }
  return true;
}

function joinRoom(players,room) {
  for (let id of players) {
    game.connections[id].join(room);
  }
}




module.exports = game;
