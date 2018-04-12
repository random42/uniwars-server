const start_time = Date.now();
const db = require('../db');
const bcrypt = require('bcrypt');

// creating server
let io = require('socket.io')({
  serveClient: false,
});

// creating namespaces
let chat = require('./chat');
let game = require('./game');

// authenticate sockets
let auth = require('socketio-auth')(io, {
  authenticate,
  postAuthenticate,
  disconnect,
  timeout: 1000
})

console.log('Socket created')

async function postAuthenticate(socket, data) {
  try {
    let _id = data._id;
    // adding socket to connected users
    socket.user_id = _id;
    console.log(socket.username,'auth')
  } catch (err) {
    console.log(err);
  }
}

async function authenticate(socket, data, callback) {
  try {
    let _id = data._id;
    let token = data.login_token;
    let user = await db.users.findOne(_id,['username','private']);
    if (!user) return callback(new Error("User not found"));
    socket.user_id = _id;
    socket.username = user.username;
    // TOKEN NOT CHECKED
    return callback(null,true);
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
  console.log('disconnecting socket',socket.id)
}
module.exports = io;
