const debug = require('debug')('socket:auth')
import _ from 'lodash/core';

export default function(io, {
  authenticate,
  postAuthenticate,
  timeout = 3000 // auth timeout
  }) {
  io.on('connection', function(socket) {
    debug('new', socket.id);
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
          debug(err.message, socket.id);
          socket.disconnect(true);
        } else {
          socket.auth = true;
          postAuthenticate(socket, data);
          socket.emit('auth', true);
          debug('auth', socket.id);
        }
      })
    })
    socket.on('disconnect', () => {
      if (socket.auth)
        debug('out', socket.id);
    })
  })
}
