const start_time = Date.now();
const db = require('../db');
const bcrypt = require('bcrypt');

// creating server
let io = require('socket.io')({
  //transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling'],
  serveClient: false,
});

io.connections = {}; // sockets indexed by user_id


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

async function postAuthenticate(socket, data) {
  try {
    let _id = data._id;
    // adding socket to connected users
    io.connections[socket.user_id] = socket;
    console.log(socket.username,'auth');

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
    // UNCOMMENT NOT TO CHECK TOKEN
    // socket.user_id = _id;
    // socket.username = user.username;
    // return callback(null,true);
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
  console.log('disconnecting socket',socket.id);
  delete io.connections[socket.user_id];
}
module.exports = io;
