// @flow

const debug = require('debug')('models:user')
import _ from 'lodash/core'
import { Model } from './model'
import * as PL from './pipeline'
import type { ID, Category, GameType, Collection, UserType } from '../types'
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
        uni: {
          _id: ID,
          name: string
        }
        major: {
          _id: ID,
          name: string
        }
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
        teams: {
          _id: ID
        }
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
        /**
         * see database models
         */
        private: Object

  static REGEX = {
    USERNAME: /^([a-z]|[A-Z])([a-z]|[A-Z]|_|\d){3,19}$/,
    // space separated words
    WORDS : /^[a-z]+(\s+[a-z]+)*$/i,
    EMAIL: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    PASSWORD: /^.{8,255}$/g,
  }

  static DEFAULT_PERF = {
    rating: 1500,
    rd: 100,
    vol: 0.06
  }

  static async create(
    form : {
      type: UserType,
      username: string,
      email: string,
      password?: string
    }
    ) : Promise<User> {
    const checkRegex = (form : Object) => {
      return User.REGEX.USERNAME.test(form.username)
      && User.REGEX.EMAIL.test(form.email)
      && User.REGEX.USERNAME.test(form.username)
      && User.REGEX.USERNAME.test(form.username)
    }
    return new User({})
  }

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
    rank : boolean = false
    ) : Promise<User[]> {
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
   * @param from Index (ranking) of first user. Starts from 0
   * @param offset Number of users to fetch
   * @param sort $sort pipeline stage. Default is descendent by rating
   * @return Users with rank field.
   */
  static async top(
    from : number = 0,
    offset : number,
    sort : Object = SORT
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

  static async getFriends(user: ID, from: number = 0, offset: number) : Promise<User[]> {
    const pl = [
      {
        $match: { _id : user }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'friends._id',
          foreignField: '_id',
          as: 'friends',
        }
      },
      {
        $unwind: 'friends'
      },
      {
        $skip: from
      },
      {
        $limit: offset
      },
      {
        $replaceRoot: { newRoot: "$friends" }
      },
      {
        $project: PROJ.SMALL
      }
    ]
    const docs = await db.users.aggregate(pl)
    return docs.map(obj => new User(obj))
  }

  /**
   * Make friend request.
   */
  static async friendRequest(from : ID, to : ID) {
    return db.users.findOneAndUpdate(to, {
      $addToSet: {
        'news': {
          type: 'friend_request',
          user: from
        }
      }
    })
  }

  static async respondNews(user: ID, news : ID, response : boolean) {
    // pulling news
    const doc = await db.findOneAndUpdate(user, {
      $pull: {
        'news': {
          _id: news
        }
      }
    })
    const newsObj = _.find(doc.news, { _id: news })
    if (response)
      User.handleNews(user, newsObj)
  }

  /**
   * @private
   * Handles positive response to news.
   */
  static handleNews(user : ID, news : Object) {
    switch(news.type) {
      case 'friend_request': {
        return User.createFriendship(user, news.user)
      }
      case "solo_challenge": {
        // TODO
      }
      case "team_invitation": {
        // TODO
      }
    }
  }

  /**
   */
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

  static async createFriendship(userA : ID, userB : ID) {
    const update = (userA, userB) => db.users.findOneAndUpdate(userA, {
      $addToSet: {
        'friends': { _id: userB }
      }
    })
    return Promise.all([update(userA,userB), update(userB, userA)])
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
    return User.REGEX.USERNAME.test(text)
  }

  /**
   * Checks validity and uniqueness of a string as username. It's case INSENSITIVE
   */
  static async isFreeUsername(text : string) : Promise<boolean> {
    if (!User.isValidUsername(text))
      return false
    const regex = new RegExp(text)
    const doc = await db.users.findOne({
      username: {
        $regex: regex,
        // case insensitive
        $options: 'i'
      }
    })
    return doc ? true : false
  }

  static async areFriends(userA : ID, userB : ID) : Promise<boolean> {
    const doc = await db.findOne({
      _id: userA,
      friends: { _id: userB }
    })
    return doc ? true : false
  }

}
