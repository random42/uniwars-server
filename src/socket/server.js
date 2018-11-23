import socketIO from 'socket.io'

// creating server
export let Server = socketIO({
  //transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling'],
  serveClient: false,
})
