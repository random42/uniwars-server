// @flow

const debug = require('debug')('models:user')
import _ from 'lodash/core'
import { Model } from './model'
import * as PL from './pipeline'
import type { ID, UserNewsType, Category, GameType, Collection, UserType } from '../types'
import type Team from './team'
import type Uni from './uni'
import { DB, dbOptions } from '../db'
import monk from 'monk'
const CATEGORIES = require('../../assets/question_categories.json')
const GAME_TYPES = require('../../assets/game_types.json')


export class User extends Model {
  /**
   * Rank based on rating. Starts from 0.
   */
  rank: number
  online: boolean

  static REGEX = {
    USERNAME: /^([a-z])([a-z]|_|\d){3,19}$/i,
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

  static SORT = {
    'perf.rating': -1
  }
  /**
   * Main sets of fields to fetch from DB.
   */
  static PROJ = {
    FULL : {
      rank: true,
      lookup: [
        {
          $lookup: {
            from : "teams",
            let: {
              id: "$_id"
            },
            pipeline: [
              // match teams user is in
              {
                $match: {
                  $expr: {
                    $eq : ["$users._id","$$id"]
                  }
                }
              },
            ],
            as: "teams"
          }
        }
      ],
      sort: {
        'perf.rating': -1
      },
      project: {
        'username' : 1,
        'first_name' : 1,
        'last_name' : 1,
        'uni': 1,
        'major': 1,
        'perf': 1,
        'stats': 1,
        'games': 1,
        'online_time': 1,
        'rank': 1,
        'teams.name': 1,
        'teams.perf': 1,
      }
    },
    SMALL : {
      rank: false,
      project: {
        'username' : 1,
        'rank': 1,
        'uni' : 1,
        'major' : 1,
        'perf' : 1,
      }
    }
  }
  /**
   *  Creates a new user.
   */
  static async create(
    type: UserType,
    username: string,
    ) : Promise<User> {
    const obj = {
      _id: monk.id(),
      type,
      username,
      perf: User.DEFAULT_PERF,
      stats: {},
      private: {},
      news: [],
      teams: [],
      games: {},
      online_time: 0,
      friends: []
    }
    await DB.get('users').insert(obj)
    return new User(obj)
  }

  /**
   * Fetch users with flexible options.
   *
   * @param match $match pipeline stage
   * @param projection What data to fetch, one of User.PROJ keys
   */
  static async fetch(
    match : Object,
    projection: $Keys<(typeof User.PROJ)> = 'SMALL',
    ) : Promise<User[]> {
    const { rank, lookup, project, sort } = User.PROJ[projection]
    // pipeline
    let append = []
    append.push({$match: match})
    if (lookup) {
      append = append.concat(lookup)
    }
    append.push({
      $project: project
    })
    const pipeline = rank ? PL.rank(User.SORT, [], append) : append
    let docs = await DB.get('users').aggregate(pipeline)
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
    sort : Object = User.SORT
    ) : Promise<User[]> {
    // adding $skip and $limit stages after $sort
    let append = [
      {
        $skip: from
      },{
        $limit: offset
      },{
        $project: User.PROJ.SMALL
      }
    ]
    let docs = await DB.get('users').aggregate(PL.rank(sort, [], append))
    return docs.map(i => new User(i))
  }


  /**
   * Get 'offset' friends of 'user' from index 'from' by default ordered
   * by friendship creation.
   */
  static async getFriends(
    user: ID,
    from: number = 0,
    offset: number,
    sort: Object = { 'start_date': 1 }
    ) : Promise<User[]> {
    const pl = [
      {
        $match: { _id : user }
      },
      {
        $unwind: "$friends"
      },
      {
        $skip: from
      },
      {
        $limit: offset
      },
      {
        $lookup: {
          from: 'users',
          let: {
            id: "$friends._id",
            date: "$friends.start_date"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$id"]
                }
              }
            },
            {
              $project: {
                ...User.PROJ.SMALL,
                friendship: {
                  start_date: "$$date",
                }
              }
            }
          ],
          as: 'docs',
        }
      },
      {
        $unwind: "$docs"
      },
      {
        $replaceRoot: {
          newRoot: '$docs'
        }
      }
    ]
    const docs = await DB.get('users').aggregate(pl)
    return docs.map(obj => new User(obj))
  }

  /**
   * Make friend request. Return news object
   */
  static async friendRequest(from : ID, to : ID) : Object {
    const news = User.makeNewsObject('friend_request', {user: from})
    await DB.get('users').findOneAndUpdate({
      // if there's no friend request pending
        _id: to,
        news: {
          $not: {
            $elemMatch: {
              type: 'friend_request',
              user: from
            }
          }
        }
      },
      // update
      {
        $push: {
          'news': news
        }
      }
    )
    return news
  }

  static makeNewsObject(type : UserNewsType, otherFields: Object = {}) : Object {
    return {
      _id: monk.id(),
      type,
      created_at: Date.now(),
      ...otherFields
    }
  }

  static async respondNews(user: ID, news : ID, response : boolean) {
    // pulling news
    const doc = await DB.get('users').findOneAndUpdate(user, {
      $pull: {
        'news': {
          _id: news
        }
      }
    }, dbOptions(['RETURN_ORIGINAL']))
    const newsObj = _.find(doc.news, (o) => o._id.equals(news))
    if (response)
      return User.handleNews(user, newsObj)
  }

  /**
   * @private
   * Handles positive response to news.
   */
  static async handleNews(user : ID, news : Object) {
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
      return DB.get('users').findOneAndUpdate(id1, {
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
    const update = (userA, userB) => DB.get('users').findOneAndUpdate(userA, {
      $addToSet: {
        'friends': { _id: userB, start_date: Date.now() }
      }
    })
    return Promise.all([update(userA,userB), update(userB, userA)])
  }

  static async addOnlineTime(user: ID, time : number) {
    return DB.get('users').findOneAndUpdate(user, {
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
    const doc = await DB.get('users').findOne({
      username: {
        $regex: regex,
        // case insensitive
        $options: 'i'
      }
    })
    return doc ? false : true
  }

  static async areFriends(userA : ID, userB : ID) : Promise<boolean> {
    const doc = await DB.get('users').findOne({
      _id: userA,
      friends: {
        $elemMatch: {
          _id: userB
        }
      }
    })
    return doc ? true : false
  }


}
