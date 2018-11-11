// @flow

const USERS = require('../../data/users.json')
const secret = require('../../secret/db.json')
const env = process.env.NODE_ENV
const uri = secret[env].uri
export const DB = require('monk')(uri)

if (env === 'TEST') {
  DB.putSomeUsers = (num) => {
    return DB.get('users').insert(USERS.slice(0, num))
  }
  DB.clearDatabase = () => {
    return Promise.all([
      DB.get('users').remove({}),
      DB.get('teams').remove({}),
      DB.get('games').remove({})
    ])
  }
  DB.clearCollections = (...names) => {
    return Promise.all(names.map((n) => DB.get(n).remove({})))
  }
  DB.getUsers = (from, to) => {
    return USERS.slice(from, to)
  }
}
