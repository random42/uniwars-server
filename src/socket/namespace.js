// @flow

import type { ID, Socket } from '../types'
import { User } from '../models'
const debug = require('debug')('socket:nsp')


export class Namespace {
  static _DEFAULT_OPTIONS = {
    authTimeout: 1000
  }
  /**
   * Reference to the socket.io server
   */
  server : Object
  /**
   * Namespace name
   */
  name : string
  /**
   * Socket.io namespace instance
   */
  nsp : Object

  /**
   * Authenticated sockets indexed by user _id
   */
  connected : Map<string, Socket>


  constructor(
    name: string,
    server: Object,
    options : {
      auth: boolean,
      authTimeout : number,
      authenticate : (event: string, data: Object) => Promise<ID>,
      onConnect: (socket: Socket) => void,
      onDisconnect: (socket: Socket) => void
    }
    ) {
      this.name = name
      this.server = server
      this.nsp = server.of('/' + name)
      this.connected = new Map()
      this.options = options
      return this._init()
  }

  _init() {
    this._disconnect()
    return this._auth()
  }

  _disconnect() {
    const { onDisconnect } = this.options
    this.nsp.on('disconnect', (socket) => {
      const id = socket.user
      if (this.connected.has(id)) {
        this.connected.delete(id)
        return onDisconnect(socket)
      }
    })
  }

  _auth() {
    const { auth, authTimeout, authenticate } = this.options
    if (!auth)
      return
    const { nsp } = this
    this.nsp.on('connect', (socket) => {
      socket.auth = false
      socket.once('auth', (...args) => {
        authenticate(...args)
        .then(user => {
          if (!user) return
          socket.auth = true
          socket.user = user
          this.addSockets([socket])
        })
        .catch(console.log)
      })
      setTimeout(() => {
        if (!socket.auth) {
          debug('authTimeout')
          socket.disconnect(false)
        }
      }, authTimeout || 1000)
    })
  }

  addSockets(sockets: Socket[]) {
    const { onConnect } = this.options
    sockets.forEach(s => {
      this.connected.set(s.user, s)
      onConnect(s)
    })
  }

  logConnectedUsers() {
    let arr = []
    this.connected.forEach((value, key, map) => {
      arr.push(value.user)
    })
    console.log(JSON.stringify(arr, null, '\t'))
  }

  emitToUsers(users: ID[], event: string, data: Object) {
    users.forEach(u => {emitToUser(u, event, data)})
  }

  emitToUser(user: ID, event: string, data: Object) {
    const socket = this.connected.get(user.toString())
    socket && socket.emit(event,data)
  }

  emitToRoom(room: string, event: string, data: Object) {
    this.nsp.to(room)
  }
  /**
   * createRoom - description
   */
  createRoom(id: string, users: ID[]) { joinRoom(id, users) }

  joinRoom(room: string, users: ID[]) {
    this._forEach(users, (socket) => {
      socket.join(room)
    })
  }

  leaveRoom(room : string, users: ID[]) {
    this._forEach(users, (socket) => {
      socket.leave(room)
    })
  }

  _forEach(users: ID[], f : (socket: Socket) => void) {
    users.forEach(u => {
      const socket = this.connected.get(u.toString())
      socket && f(socket)
    })
  }

}
