const start_time = Date.now();
const db = require('../../db');
const debug = require('debug')('socket:main');
const bcrypt = require('bcrypt');
// creating server
let io = require('socket.io')({
  //transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling'],
  serveClient: false,
});

// authenticated sockets indexed by user_id
io.connections = new Map();

// authenticate sockets
let auth = require('./auth')(io, {
  authenticate,
  postAuthenticate,
  disconnect,
  timeout: 1000
})

function postAuthenticate(socket, data) {
  let _id = data._id;
  // adding socket to connected users
  io.connections.set(socket.user_id, socket)
  // adding namespace socket to connections
  for (let i in io.nsps) {
    let nsp = io.nsps[i];
    let id = i + '#' + socket.id;
    let s = nsp.connected[id];
    if (s) {
      s.user_id = _id;
      nsp.connections.set(_id, s)
      nsp.postAuthenticate(s);
    }
  }
}

async function authenticate(socket, data, callback) {
  return callback(true)
  try {
    let _id = data._id;
    let token = data.token;
    if (io.connections.has(_id))
      return callback(new Error("User has connected yet"));
    let user = await db.users.findOne(_id, ['username','private']);
    if (!user) return callback(new Error("User not found"));
    let right = await bcrypt.compare(token, user.private.login_token);
    if (right) {
      socket.user_id = _id;
      socket.username = user.username;
      return callback(null);
    }
    return callback(new Error("Wrong token"));
  } catch(err) {
    debug(err.message);
    return callback(new Error("Server error"));
  }
}

function disconnect(socket) {
  debug('disconnecting socket',socket.user_id);
  io.connections.delete(socket.user_id);
  for (let i in io.nsps) {
    let nsp = io.nsps[i];
    if (i !== '/') {
      nsp.connections.delete(socket.user_id)
      //debug(nsp.connections);
    }
  }
}

module.exports = io;

// EXECUTING OTHER NSPS
require('./game');
require('./chat');
