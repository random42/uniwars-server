// @flow

const debug = require('debug')('crud:user')
import { Model } from './model'
import * as PL from './pipelines'
import type { ID, Category, GameType, Collection } from '../types'
import type Team from './team'
import type Uni from './uni'
import { db } from '../utils'
import monk from 'monk'

const SORT = {
  'perf.rating': -1
}



/**
 * Main sets of fields to fetch from db.
 */
const PROJ = {
  FULL : {
    'username' : 1,
    'first_name' : 1,
    'last_name' : 1,
    'uni': 1,
    'major': 1,
    'perf': 1,
    'stats': 1,
    'teams': 1,
    'games': 1,
    'online_time': 1,
    'teams.name': 1,
    'teams.perf': 1,
    'uni.name': 1,
    'uni.country': 1,
    'rank': 1
  },
  SMALL : {
    'username' : 1,
    'rank': 1,
    'uni' : 1,
    'major' : 1,
    'perf' : 1,
  }
}

/**
 * Keys are documents' fields that contain _id or array of _ids
 * of documents from other collections
 */
const LOOKUP = {
  'teams' : {
    lookup : {
      from: 'teams',
      localField: 'teams',
      foreignField: '_id',
      as: 'teams',
    }
  },
  'uni' : {
    lookup : {
      from: 'unis',
      localField: 'uni',
      foreignField: '_id',
      as: 'uni',
    }
  }
}



/**
 * These are computed and database properties that this class can have
 * after fetching.
 */
export class User extends Model {
        _id: ID
        /**
         * Rank based on rating. Starts from 0.
         */
        rank: number
        username: string
        email: string
        first_name: string
        last_name: string
        uni: ID | Uni
        major: string
        perf: {
          rating: number,
          rd: number,
          vol: number
        }
        stats: Array<{
          category: Category,
          hit: number,
          miss: number
        }>
        /**
         * Computed
         */
        teams: ID[] | Team[]
        games: Array<{
          type: GameType,
          wins: number,
          draws: number,
          losses: number,
        }>
        /**
         *  Milliseconds spent online (connected socket) since registered.
         */
        online_time: number
        friends: ID[] | User[]

  static usernameRegex = /^([a-z]|[A-Z])([a-z]|[A-Z]|_|\d){}$/

  /**
   * Fetch users with flexible options.
   *
   * @param match $match pipeline stage
   * @param lookup Fields that contain Mongo Id to lookup
   * from another collection. (uni/teams)
   * @param project Type of projection
   * @param rank Attach 'rank' field
   */
  static async fetch(
    match : Object,
    lookup : $Keys<(typeof LOOKUP)>[] = [],
    project: $Keys<(typeof PROJ)> = 'SMALL',
    rank : boolean = false) : Promise<User[]> {
    // pipeline
    let append = [
      {
        $match: match
      }
    ]
    for (let field of lookup) {
      // lookup external documents
      append.push({
        $lookup: LOOKUP[field].lookup
      })
    }
    append.push({
      $project: PROJ[project]
    })
    const pipeline = rank ? PL.rank(SORT, [], append) : append
    let docs = await db.users.aggregate(pipeline)
    return docs.map(i => new User(i))
  }


  /**
   * Fetch top rated users.
   * @param sort $sort pipeline stage. Default is descendent by rating
   * @param from Index (ranking) of first user. Starts from 0
   * @param offset Number of users to fetch
   * @return Users with rank field.
   */
  static async top(
    sort : Object = SORT,
    from : number = 0,
    offset : number
    ) : Promise<User[]> {
    // adding $skip and $limit stages after $sort
    let append = [
      {
        $skip: from
      },{
        $limit: offset
      },{
        $project: PROJ.SMALL
      }
    ]
    let docs = await db.users.aggregate(PL.rank(sort, [], append))
    return docs.map(i => new User(i))
  }


  /**
   * @name topNearPlayer
   * @todo
   */

  static async friendRequest(from : ID, to : ID) {
    
  }

  static async removeFriendship(userA : ID, userB : ID) {
    let ops = []
    let update = (id1 : ID, id2 : ID) => {
      return db.users.findOneAndUpdate(id1, {
        $pull: {
          'friends': {
            _id: id2
          }
        }
      })
    }
    ops.push(update(userA, userB))
    ops.push(update(userB, userA))
    return Promise.all(ops)
  }

  static async addOnlineTime(user: ID, time : number) {
    return db.users.findOneAndUpdate(user, {
      $inc: {
        'online_time': time
      }
    })
  }


  /**
   * Username must be between 4-20 characters, must start with a letter
   * and can have letters, digits and '_'.
   */
  static isValidUsername(text : string) : boolean {
    return User.usernameRegex.test(text)
  }


  /**
   * Checks uniqueness of a string as username. It's case INSENSITIVE
   */
  static async isFreeUsername(text : string) : Promise<boolean> {
    if (!User.isValidUsername(text))
      return false
    const regex = new RegExp(text)
    const doc = await db.users.findOne({
      username: {
        $regex: regex,
        $options: 'i'
      }
    })
    return doc ? true : false
  }

}
