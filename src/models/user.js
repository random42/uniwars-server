// @flow

const debug = require('debug')('models:user')
import _ from 'lodash/core'
import { crypto } from '../security'
import { Model } from './model'
import * as PL from './pipeline'
import type { ID, UserNewsType, Category, GameType, Collection, UserType } from '../types'
import type {Team} from './team'
import type {Uni} from './uni'
import { DB, dbOptions } from '../db'
import monk from 'monk'
const CATEGORIES = require('../../assets/question_categories.json')
const GAME_TYPES = require('../../assets/game_types.json')


export class User extends Model {
  rank: number
  online: boolean

  static COLLECTION : Collection = "users"

  static SORT = {
    RATING: {
      'perf.rating': -1
    }
  }

  /**
   * Main sets of fields to fetch from DB.
   */
  static FETCH = {
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
      sort: User.SORT.RATING,
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

  static PASSWORD_SALT : number = 10


  /**
   * See {@link Model.top}
   */
  static async top(...args : any) {
    return Model.top(...args, User)
  }

  /**
   * See {@link Model.fetch}
   */
  static async fetch(...args : any) {
    return Model.fetch(...args, User)
  }

  /**
   *  Creates a new user.
   */
  static async create(
    data : {
      type: UserType,
      username: string,
      email? : string,
      password? : string
    }
    ) : Promise<User> {
    let form = {...data}
    if (form.password) {
      form.password = await crypto.hash(form.password, User.PASSWORD_SALT)
    }
    let obj = {
      _id: monk.id(),
      ...form,
      perf: User.DEFAULT_PERF,
      stats: {},
      news: [],
      games: {},
      online_time: 0,
      friends: []
    }
    const doc = await DB.get('users').insert(obj)
    return new User(doc)
  }

  static async search(text : string, skip: number, limit : number) : Promise<User[]> {
    let regex = new RegExp(text)
    let pipeline = [
      {
        $match: {
          username: {
            $regex: regex,
            // case insensitive
            $options: 'i',
          }
        }
      },
      // match text in username and full_name
      {
        $skip: skip
      },
      {
        $limit: limit
      },
      {
        $project: User.FETCH.SMALL.project
      }
    ]
    const docs = await DB.get('users').aggregate(pipeline)
    return docs
  }

  static async block(user: ID, blocked: ID, scopes: Object) {
    const update = await DB.get("users").findOneAndUpdate({
      _id: user,
      blocked_users: {
        _id: blocked
      }
    },{
      'blocked_users.$': {
        _id: blocked,
        ...scopes
      }
    })
    if (!update) {
      await DB.get("users").findOneAndUpdate(user, {
        $push: {
          "blocked_users": {
            _id: blocked,
            ...scopes
          }
        }
      })
    }
  }

  static async unblock(user: ID, blocked: ID) {
    await DB.get('users').findOneAndUpdate(user, {
      $pull: {
        "blocked_users": {
          _id: blocked
        }
      }
    })
  }

  /**
   * Get 'offset' friends of 'user' from index 'from' by default ordered
   * by friendship creation.
   */
  static async getFriends(
    user: ID,
    from: number = 0,
    offset: number
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
                ...User.FETCH.SMALL.project,
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
      },
      {
        $sort: {
          'friendship.start_date' : 1
        }
      }
    ]
    const docs = await DB.get('users').aggregate(pl)
    return docs
  }
  /**
   * Make friend request. Return news object
   */
  static async friendRequest(from : ID, to : ID) : Promise<Object> {
    const news = User.makeNewsObject('friend_request', {user: from})
    await DB.get('users').findOneAndUpdate({
      // if there's no friend request pending
      _id: to,
      news: {
        $not: {
            type: 'friend_request',
            user: from
          }
        }
      },
      // update
      {
        $push: {
          'news': news
        }
      },
      dbOptions(['NO_PROJ'])
    )
    return news
  }

  static async challenge(from: ID, to: ID) : Promise<Object> {
    const news = User.makeNewsObject("solo_challenge", {user: from})
    const update = await DB.get('users').findOneAndUpdate({
      _id: to,
      news: {
        $elemMatch: {
          $not: {
            type: "solo_challenge",
            user: from
          }
        }
      }
    }, {
      $push: {
        news: news
      }
    })
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

  static async pullNews(user: ID, news : ID, response : string) : Promise<Object> {
    // pulling news
    const doc = await DB.get('users').findOneAndUpdate(user, {
      $pull: {
        'news': {
          _id: news
        }
      }
    }, dbOptions(['RETURN_ORIGINAL'], {fields: {news: 1}}))
    const newsObj = _.find(doc.news, (o) => o._id.equals(news))
    return newsObj
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
      $push: {
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

  static async isBlocked(user: ID, blocked: ID, scopes : Object) Promise<boolean> {
    const doc = await DB.get('users').findOne({
      _id: user,
      blocked_users: {
        _id: blocked,
        ...scopes
      }
    }, {projection: {_id: 1}})
    return doc ? true : false
  }
}
