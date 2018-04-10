const start_time = Date.now();
const db = require('../db');
const bcrypt = require('bcrypt');

// creating server
const io = require('socket.io')({
  serveClient: false,
});

// creating namespaces
const chat = io.of('/chat');
const game = io.of('/game');
let connections = {}; // sockets indexed by user_id

const chatPostAuth = require('./chat');

// authenticate sockets
require('socketio-auth')(io, {
  authenticate,
  postAuthenticate,
  disconnect,
  timeout: 1000
})

async function postAuthenticate(socket, data) {
  try {
    let _id = data._id;
    // adding socket to connected users
    socket.user_id = _id;
    connections[_id] = socket;
    if (socket.id in chat.connected) {
      await chatPostAuth(socket);
    }
  } catch (err) {
    console.log(err);
  }
}

async function authenticate(socket, data, callback) {
  return setTimeout(callback,100,null,true);
  try {
    let _id = data._id;
    let token = data.login_token;
    let user = await db.users.findOne(_id,['username','private']);
    if (!user) return callback(new Error("User not found"));
    let right = await bcrypt.compare(token,user.private.login_token);
    if (right) {
      socket.user_id = _id;
      socket.username = user.username;
      return callback(null,true);
    }
    return callback(new Error("Wrong token"));
  } catch(err) {
    console.log(err);
    return false;
  }
}

function disconnect(socket) {
  delete connections[socket.user_id];
}
module.exports = {io,connections};
