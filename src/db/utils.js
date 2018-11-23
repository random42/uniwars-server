// @flow

import { DB } from './db'
import DATA from '../../data'
import type { ID, Collection } from '../types'

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

export async function logDoc(id : ID, collection: Collection, fields : Object) {
  const doc = await DB.get(collection).findOne(id, { fields })
  console.log(doc)
}

// attach functions to DB object
for (let i in module.exports) {
  DB[i] = module.exports[i]
}
