const start_time = Date.now();
const db = require('../../db');
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
  console.log(socket.id);
  let _id = data._id;
  // adding socket to connected users
  io.connections.set(socket.user_id, socket)
  // adding namespace socket to connections
  for (let i in io.nsps) {
    let nsp = io.nsps[i];
    let id = i + '#' + socket.id;
    let s = nsp.connected[id];
    if (s) {
      console.log(id);
      s.user_id = _id;
      nsp.connections.set(_id, s)
      nsp.postAuthenticate(s);
    }
  }
  console.log(socket.username,'auth');
}

async function authenticate(socket, data, callback) {
  //return callback(true)
  try {
    console.log('Auth in progress', data)
    let _id = data._id;
    let token = data.token;
    let user = await db.users.findOne(_id,['username','private']);
    if (!user) return callback(new Error("User not found"));
    //UNCOMMENT NOT TO CHECK TOKEN
    socket.user_id = _id;
    socket.username = user.username;
    return callback();
    let right = await bcrypt.compare(token,user.private.login_token);
    if (right) {
      socket.user_id = _id;
      socket.username = user.username;
      return callback();
    }
    return callback(new Error("Wrong token"));
  } catch(err) {
    console.log(err);
    return callback(new Error("Server error"));
  }
}

function disconnect(socket) {
  console.log('disconnecting socket',socket.user_id);
  io.connections.delete(socket.user_id)
}

module.exports = io;

let game = require('./game');
let chat = require('./chat');
