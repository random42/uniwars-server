import { db as DB } from '../../src/utils'
import { ReadPreference } from 'mongodb'
const USERS = require('../../data/users.json')

DB.options = {
  readConcern: {
    level: "linearizable"
  },
  w: "majority",
  readPreference: ReadPreference.PRIMARY
}

export const db = {
  ...DB,
  putSomeUsers(num) {
    return DB.get('users').insert(USERS.slice(0, num))
  },

  clearDatabase() {
    return Promise.all([
      DB.get('users').remove({}),
      DB.get('teams').remove({}),
      DB.get('games').remove({})
    ])
  },

  clearCollections(...names) {
    return Promise.all(names.map((n) => DB.get(n).remove({})))
  },

  getUsers(from, to) {
    return USERS.slice(from, to)
  }
}
