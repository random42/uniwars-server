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
