import io from 'socket.io'

export const server = io({
  //transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling'],
  serveClient: false,
})

export const main = server.of('/')
export const game = server.of('/game')



export default module.exports
