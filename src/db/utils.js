// @flow

import { DB } from './db'
import { DATA } from '../../__tests__/config'
import type { ID } from '../types'

export function putSomeUsers(num : number) {
  return DB.get('users').insert(DATA.USERS.slice(0, num))
}
export function clearDatabase() {
  return Promise.all([
    DB.get('users').remove({}),
    DB.get('teams').remove({}),
    DB.get('games').remove({})
  ])
}
export function clearCollections(...names : string[]) {
  return Promise.all(names.map((n) => DB.get(n).remove({})))
}

export async function logUser(id : ID, fields : Object) {
  const doc = await DB.get('users').findOne(id, { projection: fields })
  console.log(doc)
}

// attach functions to DB object
for (let i in module.exports) {
  DB[i] = module.exports[i]
}
