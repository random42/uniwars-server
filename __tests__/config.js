import { db } from '../src/utils'
const USERS = require('../data/users_1000.json')

test('a',() => {
  expect(1).not.toBe(0)
})

const dbUtils = {
  ...db,
  putSomeUsers(num) {
    return db.users.insert(USERS.slice(0, num))
  },

  clearDatabase() {
    return Promise.all([
      db.users.remove({}),
      db.teams.remove({})
    ])
  },

  clearCollections(...names) {
    return Promise.all(names.map((n) => db[n].remove({})))
  },

  getUsers(from, to) {
    return USERS.slice(from, to)
  },


}


module.exports = {
  db: dbUtils
}
