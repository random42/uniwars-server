const debug = require('debug')('socket:auth');

module.exports = function(io, {
  authenticate,
  postAuthenticate,
  disconnect,
  timeout = 1000 // auth timeout
  }) {
  io.on('connection', function(socket) {
    let tmout = setTimeout(() => {
      if (!socket.auth) {
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
          debug(socket.user_id, 'connected');
        }
      })
    })
    socket.on('disconnect', () => disconnect(socket))
  })
}
