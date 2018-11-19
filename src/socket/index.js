// @flow
import { ID } from '../types'
import socketIO from 'socket.io'
const debug = require('debug')('socket:index')

// creating server
export let server = socketIO({
  //transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling'],
  serveClient: false,
})

// authenticated sockets indexed by user_id
server.connections = new Map()

export let main = server.of('/')
main.connections = server.connections
export let game = server.of('/game')
game.connections = new Map()

export const isUserOnline = (user : ID) => {
  return server.connections.has(user.toString())
}


export default module.exports
