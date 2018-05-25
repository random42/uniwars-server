const debug = require('debug')('socket:utils');

const utils =  {
  nspAuth({nsp, socket, io}) {
    // slicing namespace name from id to obtain original id
    debug(nsp.name);
    let id = socket.id.slice(nsp.name.length + 1);
    // checking auth
    let main = io.connected[id];
    if (!main || !main.auth) {
      return false;
    }
    else {
      socket.user_id = main.user_id;
      return true;
    }
  },

  nspOnDisconnect({nsp, socket}) {
    if (socket.auth) {
      debug(nsp.name, 'disconnect auth', socket.user_id);
      nsp.connections.delete(socket.user_id);
    } else {
      debug(nsp.name, 'disconnect', socket.id);
    }
  }
}

module.exports = utils;
