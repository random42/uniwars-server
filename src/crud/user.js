// @flow

const debug = require('debug')('crud:user')
import { Model } from './model'
import * as PL from './pipelines'
import type { ID, Category, GameType, Collection } from '../types'
import type Team from './team'
import { db } from '../utils/db'
import monk from 'monk'
import { utils } from '../utils'

const SORT = {
  'perf.rating': -1
}

const PROJ = {
  full : {
    'username' : 1,
    'first_name' : 1,
    'last_name' : 1,
    'uni': 1,
    'major': 1,
    'perf': 1,
    'stats': 1,
    'teams': 1,
    'games': 1,
    'online_time': 1
  },
  small : {
    'username' : 1,
    'uni' : 1,
    'major' : 1,
    'perf' : 1,
  }
}

const LOOKUP = {
  'teams' : {
    lookup : {
      from: 'teams',
      localField: 'teams',
      foreignField: '_id',
      as: 'teams',
    },
    project: {
      'teams.name': 1,
      'teams.perf': 1,
    }
  },
  'uni' : {
    lookup : {
      from: 'unis',
      localField: 'uni',
      foreignField: '_id',
      as: 'uni',
    },
    project: {
      'uni.name': 1,
      'uni.country': 1
    }
  }
}



/**
 *
 */
export class User extends Model {
  _id: ID
  username: string
  email: string
  first_name: string
  last_name: string
  uni: ID
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
  teams: Team[]
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
  friends: ID[]


  /**
   * Fetch users with flexible options.
   * @param match $match pipeline stage
   * @param lookup Fields to lookup (uni/teams)
   * @param projection Type of projection
   * @param rank Attach 'rank' field
   */
  static async fetch(
    match : Object = {},
    lookup? : string[] = [],
    projection?: $Keys<typeof PROJ> = 'small',
    rank? : boolean = false) : Promise<User[]> {
    let project = PROJ[projection]
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
      // choose the fields to project
      project = { ...project, ...LOOKUP[field].project}
    }
    append.push({
      $project: project
    })
    const pipeline = rank ? PL.rank(SORT, [], append) : append
    let docs = await db.users.aggregate(pipeline)
    return docs.map(i => new User(i))
  }


  /**
   * Fetch top rated users.
   * @param from Index (rank) of first user. Starts from 0
   * @param offset Number of users to fetch
   * @return Users with rank field.
   */
  static async top(from : number = 0, offset: number) : Promise<User[]> {
    // adding $skip and $limit stages after $sort
    let append = [
      {
        $skip: from
      },{
        $limit: offset
      }
    ]
    let docs = await db.users.aggregate(PL.rank(SORT, [], append))
    return docs.map(i => new User(i))
  }

  static async removeFriendship(friends : ID[]) {
    if (friends.length !== 2) return Promise.reject("Users must be 2.")
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
    ops.push(update(friends[0], friends[1]))
    ops.push(update(friends[1], friends[0]))
    return Promise.all(ops)
  }

  static async addOnlineTime(user: ID, time : number) {
    return db.users.findOneAndUpdate(user, {
      $inc: {
        'online_time': time
      }
    })
  }


}
