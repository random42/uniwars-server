
const debug = require('debug')('socket:auth')
import { _ } from 'lodash/core';

export default function (io, {
  authenticate,
  postAuth,
  manageNsps,
  onDisconnect,
  timeout,
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
    socket.once('auth', (data) => {
      authenticate(socket, data)
      .then((user) => {
        if (user) {
          debug('auth', user)
          const time = Date.now()
          let obj = getSockets(socket)
          for (let i in obj) {
            obj[i].auth = true
            obj[i].authTime = time
            obj[i].user = user
          }
          onAuth(obj, data)
        }
      })
      .catch(console.log)
    })
    socket.on('disconnect', (reason) => {
      debug(reason)
      if (socket.auth)
        debug('out', socket.user)
      onDisconnect && onDisconnect(socket, reason)
    })
  })
}
