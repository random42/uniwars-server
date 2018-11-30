import { DB } from '../db';
const debug = require('debug')('socket:init')
import {User} from '../models'
import _ from 'lodash'
import { server, main, game } from './index'
import { localLogin } from '../security'
import mainHandler from './main'
import gameHandler from './game'

// authenticate sockets
import auth from './auth'

auth(server, {
  authenticate,
  postAuth,
  manageNsps: true,
  timeout: 1000
})

const initNsp = (n) => {
  n.auth = new Map()
  n.getSocket = n.auth.get
  n.isConnected = n.auth.has
  n.areConnected = (users) => {
    let b = true
    let i = 0
    while (i < users.length && b) {
      b = n.isConnected(users[i++])
    }
    return b
  }
  n.emitToUser = (user, event, ...message) => {
    if (n.auth.has(user)) {
      const socket = n.auth.get(user)
      socket.emit(event, ...message)
      return true
    } else
      return false
  }
  n.emitToUsers = (users, event, ...message) => {
    for (let u of users) {
      n.emitToUser(u, event, ...message)
    }
  }
  n.joinRoom = (users, room) => {
    for (let u of users) {
      n.getSocket(u).join(room)
    }
  }
  n.leaveRoom = (users, room) => {
    for (let u of users) {
      n.getSocket(u).leave(room)
    }
  }
  n.on('disconnect', (socket) => {
    if (socket.auth) {
      const id = socket.user._id
      n.auth.delete(id)
    }
  })
}

for (let name in server.nsps) {
  initNsp(server.nsps[name])
}


const eventHandlers = {
  '/': mainHandler,
  '/game': gameHandler
}

function postAuth(sockets, data) {
  for (let nsp in sockets) {
    const socket = sockets[nsp]
    server.of(nsp).auth.set(socket.user._id, socket)
    eventHandlers[nsp](socket, data)
  }
}

async function authenticate(socket, data) {
  const { user, password } = data
  let u = await localLogin(user, password)
  return _.pick(u, ['_id', 'username'])
}
