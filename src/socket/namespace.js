// @flow

import { Namespace as NSP, Socket } from 'socket.io'

export class Namespace extends NSP {



  async isUserConnected(user: string) : Promise<boolean> {
    const clients = await this.clients([user])
    return clients.length > 0
  }

  async areUsersConnected(users: string[]) : Promise<boolean[]> {
    const booleans = await Promise.all(users.map((u) => this.isUserConnected(u)))
    for (let b of booleans) {
      if (!b)
        return false
    }
    return true
  }

  async clients(rooms) {
    return new Promise((res, rej) => {
      super.clients(rooms, (err, clients) => {
        if (err) {
          rej(err)
          return
        }
        res(clients)
      })
    })
  }

  authUser(socket: Socket, user: string) {
    socket.user = user
    socket.auth = true
    socket.authTime = Date.now()
    socket.join(user)
  }

  async usersRooms(users: string[]) : string[] {

  }

  async createRoom(name: string, users: string[]) {

  }

  leaveRoom(room: string, users: string[]) {

  }
}
