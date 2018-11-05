const debug = require('debug')('socket:index')

// creating server
export let server = require('socket.io')({
  //transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling'],
  serveClient: false,
})

// authenticated sockets indexed by user_id
server.connections = new Map();

export let main = server.of('/');
main.connections = server.connections;
export let game = server.of('/game')
game.connections = new Map()


export default module.exports
