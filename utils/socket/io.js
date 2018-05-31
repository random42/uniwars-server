const _ = require('lodash/core');
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

// initialize namespaces
const nspInit = (name) => {
  let nsp = io.of('/' + name);
  // same as io.connections
  nsp.connections = new Map();
  return nsp;
}
const nsps = ['game','chat'];
_.forEach(nsps, nspInit);

module.exports = io;
const chat = require('./chat');
const game = require('./game');


// authenticate sockets
let auth = require('./auth')(io, {
  authenticate,
  postAuthenticate,
  timeout: 1000
})

function postAuthenticate(socket, data) {
  let _id = data._id;
  socket.user_id = _id;
  // adding socket to connected users
  io.connections.set(socket.user_id, socket)
}

async function authenticate(socket, data, callback) {
  return callback(null)
  try {
    let {_id, token} = data;
    if (io.connections.has(_id))
      return callback(new Error("User has connected yet"));
    let user = await db.users.findOne(_id, ['username','private']);
    if (!user) return callback(new Error("User not found"));
    let right = await bcrypt.compare(token, user.private.login_token);
    if (right) {
      return callback(null);
    }
    return callback(new Error("Wrong token"));
  } catch(err) {
    debug(err.message);
    return callback(new Error("Server error"));
  }
}
