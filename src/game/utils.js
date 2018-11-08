// @flow

import type { ID, GameType } from '../types'
import index from './index'
import monk from 'monk'
import { db } from '../utils'

/**
 * Creates and insert game in database.
 *
 * 'players.perf' field will be set after game start
 * @return instance of game type class (Solo for type 'solo'...)
 */
export async function createGame(
    side0 : ID[],
    side1 : ID[],
    type : GameType,
    options? : {
      teams?: ID[],
    } = {}) : any {
  let obj : Object = {
    _id: monk.id().toString(),
    created_at: Date.now(),
    type
  }
  obj.players = side0.concat(side1).map((id, index) => {
    return {
      _id: monk.id(id),
      side: side0.indexOf(id) >= 0 ? 0 : 1,
      index: 0,
      answers: []
    }
  })
  if (options.teams) {
    obj.teams = options.teams.map(id => monk.id(id))
  }
  // makes first letter uppercase
  const typeToClass = (text) => {
    return text.slice(0,1).toUpperCase() + text.slice(1, text.length)
  }
  const doc = await db.get('games').insert(obj)
  return new index[typeToClass(type)](doc)
}
