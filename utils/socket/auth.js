const debug = require('debug')('socket:auth');
const _ = require('lodash/core');

module.exports = function(io, {
  authenticate,
  postAuthenticate,
  timeout = 3000 // auth timeout
  }) {
  io.on('connection', function(socket) {
    debug('try', socket.id);
    let tmout = setTimeout(() => {
      if (!socket.auth) {
        debug('timeout', socket.id);
        socket.disconnect(true);
      }
    }, timeout)
    socket.auth = false;
    socket.on('auth', function(data) {
      authenticate(socket, data, function(err) {
        if (err) {
          debug(err.message);
          socket.disconnect(true);
        } else {
          socket.auth = true;
          postAuthenticate(socket, data);
          socket.emit('auth', true);
          debug('in', socket.id);
        }
      })
    })
    socket.on('disconnect', () => {
      if (socket.auth)
        debug('out', socket.id);
    })
  })

  _.forEach(io.nsps, (nsp, name) => {
    // main namespace does not need auth
    if (name === '/')
      return
    nsp.on('connection', (socket) => {
      // slicing namespace name from id to obtain original id
      let id = socket.id.slice(name.length + 1);
      // checking auth
      let main = io.of('/').connected[id];
      if (!main || !main.auth) return
      else {
        debug(socket.id);
        // auth successful
        socket.user_id = main.user_id;
        socket.auth = true;
        nsp.connections.set(socket.user_id, socket);
      }
    })
    nsp.on('disconnect', (socket) => {
      if (!socket.auth)
        return;
      nsp.connections.delete(socket.user_id);
    })
  })
}
