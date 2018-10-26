import db from '../utils/db';
const debug = require('debug')('socket:init')
import bcrypt from 'bcrypt';
import crud from '../crud'
let { server } = require('./index');
require('./main');
require('./chat');
require('./game');

// authenticate sockets
import auth from './auth'
auth(server, {
  authenticate,
  postAuthenticate,
  timeout: 1000
})

for (let nsp in server.nsps) {
  let n = server.nsps[nsp];
  n.on('disconnect', (socket) => {
    if (socket.auth) {
      let user = socket.user_id
      n.connections.delete(user)
    }
  })
}

function postAuthenticate(socket, data) {
  let { _id } = data
  let id = socket.id
  socket.authTime = Date.now()
  socket.on('disconnect', () => {
    crud.user.addOnlineTime({user, time: Date.now() - socket.authTime})
    .catch(err => debug(err.message))
  })
  // server and main nsp map
  server.connections.set(_id, socket)
  const nspPostAuth = (_id, id, nsp) => {
    let s = nsp.connected[nsp.name + '#' + id]
    if (s) {
      // other namespaces map
      nsp.connections.set(_id, s)
      s.user_id = _id
      nsp.postAuthenticate(s)
    }
  }
  for (let nsp in server.nsps) {
    nspPostAuth(_id, id, server.nsps[nsp])
    // debug(server.nsps[nsp].connections.keys())
  }
}

async function authenticate(socket, data, callback) {
  return callback(null)
  try {
    let { _id, token } = data;
    if (server.connections.has(_id))
      return callback(new Error("User has connected yet"));
    let user = await db.users.findOne(_id, ['username','private.access_token']);
    if (!user) return callback(new Error("User not found"));
    let right = await bcrypt.compare(token, user.private.access_token);
    if (right) {
      return callback(null);
    }
    return callback(new Error("Wrong token"));
  } catch(err) {
    debug(err.message);
    return callback(new Error("Server error"));
  }
}
