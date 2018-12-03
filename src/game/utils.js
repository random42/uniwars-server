// @flow

import type { ID, GameType } from '../types'
import _ from 'lodash'
import index from './index'
import { Question } from '../models'
import monk from 'monk'
import { DB } from '../db'



/**
 * Returns game initialized with right class.
 */
export function getInstance(game: Object) {
  // makes first letter uppercase
  const typeToClass = _.upperFirst
  game.questions = game.questions.map(Question)
  return new index[typeToClass(doc.type)](doc)
}

/**
 * Creates and insert game in database.
 *
 * 'players.perf' field will be set after game start
 * @return Instance of game
 */
export async function createGame(
    side0 : ID[],
    side1 : ID[],
    type : GameType,
    options : {
      teams?: ID[],
      prize?: number
    } = {}
    ) : any {
  let obj = {
    _id: monk.id().toString(),
    created_at: Date.now(),
    type
  }
  const fetchUsers = async (users) => {
    return DB.get('users').find({
      _id: { $in: users }
    },{
      multi: true,
      fields: {
        username: 1,
        perf: 1
      }
    })
  }
  const [ s0, s1 ] = await Promise.all([
    fetchUsers(side0),
    fetchUsers(side1)
  ])
  obj.prize = options.prize
  const players = s0.concat(s1)
  obj.players = players.map((user, index) => {
    return {
      ...user,
      side: index < players.length / 2 ? 0 : 1,
      answers: []
    }
  })
  const doc = await DB.get('games').insert(obj)
  return getInstance(doc)
}


/**
 * Fetch and initialize with right class.
 */
export async function fetchGame(game: ID) {
  const doc = await DB.get('games').findOne(game)
  return doc ? getInstance(doc) : undefined
}
