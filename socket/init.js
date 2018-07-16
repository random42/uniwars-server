const db = require('../utils/db');
const debug = require('debug')('socket:main');
const bcrypt = require('bcrypt');
let { server } = require('./index');
require('./main');
require('./chat');
require('./game');

// authenticate sockets
let auth = require('./auth')(server, {
  authenticate,
  postAuthenticate,
  timeout: 1000
})

for (let nsp in server.nsps) {
  let n = server.nsps[nsp];
  n.on('disconnect', (socket) => {
    if (socket.auth) {
      n.connections.delete(socket.user_id);
    }
  })
}

function postAuthenticate(socket, data) {
  let { _id } = data;
  let id = socket.id;
  const nspPostAuth = (_id, id, nsp) => {
    let s = nsp.connected[nsp.name + '#' + id];
    if (s) {
      nsp.connnections.set(_id, s);
      s.user_id = _id;
    }
    nsp.postAuthenticate(s);
  }
  for (let nsp in server.nsps) {
    nspPostAuth(_id, id, server[nsp]);
    debug(server[nsp].connections);
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
