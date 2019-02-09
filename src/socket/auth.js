// @flow
const debug = require('debug')('socket:auth')
import { Namespace, Socket } from 'socket.io'
import { _ } from 'lodash/core'
import { isAsync } from '../utils'

export default function (io, {
  auth: (socket: Socket, data: Object) => Promise<Boolean>,
  postAuth: (socket: Socket) => any,
  manageNsps: Boolean,
  onDisconnect: (socket: Socket, reason) => any,
  timeout: number
  }) {
  const getSockets = (socket) => {
    const id = socket.id
    const nsps = io.nsps
    let obj = {'/': socket}
    for (let name in nsps) {
      const idd = name + "#" + id
      const s = nsps[name].connected[idd]
      if (s) {
        obj[name] = s
      }
    }
    return obj
  }
  io.on('connection', (socket) => {
    debug('new', socket.id)
    let tmout = setTimeout(() => {
      if (!socket.auth) {
        debug('timeout', socket.id)
        socket.disconnect(manageNsps)
      }
    }, timeout || 1000)
    socket.auth = false;
    socket.once('auth', async (data) => {
      const user = await auth(socket, data)
      if (user) {
        debug('auth', user)
        const time = Date.now()
        let obj = getSockets(socket)
        // run postAuth for each nsp
        _.forEach(obj, (socket, nsp) => {
          postAuth(socket)
          socket.on('disconnect', (reason) => {
            debug(reason)
            if (socket.auth) {
              debug('out', socket.user)
              onDisconnect && onDisconnect(socket, reason)
            }
          })
        })
        onAuth(obj, data)
      }
    })

  })
}
