const debug = require('debug')('socket:main');

// creating server
let server = require('socket.io')({
  //transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling'],
  serveClient: false,
});

// authenticated sockets indexed by user_id
server.connections = new Map();

let main = server.of('/');
main.connections = server.connections;

let chat = server.of('/chat')
chat.connections = new Map()
let game = server.of('/game')
game.connections = new Map()

module.exports = {
  server,
  main,
  chat,
  game
}
