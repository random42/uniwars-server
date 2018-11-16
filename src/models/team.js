// @flow

const debug = require('debug')('models:team')
import { DB } from '../db'
import { Model } from './model'
import type { ID, Collection } from '../types'
import * as PL from './pipeline'
import monk from 'monk'
import { _ } from 'lodash/core'

const { DEFAULT_PERF } = require('../constants')


export class Team extends Model {

  rank: number

  static COLLECTION : Collection = "teams"

  static FETCH = {
    FULL : {
      rank: true,
      lookup: [
        {
          $lookup: {
            from: "users",
            let: {
              users: "$users",
            },
            pipeline: [
              {
                $match: {
                  _id: {
                    $in: "$$users._id"
                  }
                }
              }
            ],
            as: "users_docs"
          }
        }
      ],
      project: {
        name: 1,
        users: 1,
        perf: 1,
        games: 1
      }
    },
    SMALL : {
      project: {
        name: 1,
        users: 1,
        perf: 1
      }
    }
  }

  static async fetch(...args) {
    return Model.fetch(...args, Team)
  }

  /*
    assumes that founder is not in users array
    creates the team and the team chat
    returns team doc
  */
  static async create({name, users, founder}) {
    users = users.map(u => { return {_id: monk.id(u), admin: false} })
    users.push({_id: monk.id(founder), admin: true})
    const team_id = monk.id()
    const chat_id = monk.id()
    let team = DB.get('teams').insert({
      _id: team_id,
      name,
      users,
      founder: monk.id(founder),
      perf: DEFAULT_PERF,
      games: {
        wins: 0,
        losses: 0,
        draws: 0
      },
      chat: chat_id,
      challenges: []
    })
    let chat = DB.chats.insert({
      _id: chat_id,
      collection: "teams",
      type: "group",
      name,
      messages: [],
      participants: users
    })
    let updateUsers = DB.get('users').update({
      _id: { $in: users.map(u => u._id) }
    },{
      $addToSet: {
        teams: team_id
      }
    })
    let res = await Promise.all([team, chat, updateUsers])
    return res[0]
  }

  static async delete({team}) {
    let doc = await DB.get('teams').findOne(team)
    if (!doc) return
    return Promise.all([
      // remove team from users
      DB.get('users').update(
        { _id: {
            $in: doc.users.map(u => u._id)
        }},
        {
          $pull: {
            teams: team
          }
        }, { multi: true }
      ),
      // elimina il team
      DB.get('teams').findOneAndDelete(team)
    ])
  }

  static async addMember({team, user}) {
    let updates = [
      DB.get('teams').findOneAndUpdate(team,{
        $push: {
          users: {
            _id: monk.id(user),
            admin: false
          }
        }
      }),
      DB.get('users').findOneAndUpdate(user,{
        $addToSet: {
          teams: monk.id(team)
        }
      })
    ]
    return Promise.all(updates)
  }

  static async removeMember({team, user}) {
    let updates = [
      DB.get('teams').findOneAndUpdate(team,{
        $pull: {
          users: {
            _id: monk.id(user)
          }
        }
      }),
      DB.get('users').findOneAndUpdate(user,{
        $pull: {
          teams: monk.id(team)
        }
      })
    ]
    return Promise.all(updates)
  }

  static async makeAdmin({team, user}) {
    return DB.get('teams').findOneAndUpdate({
      _id: team,
      users: { _id: user }
    },{
      $set: {
        'users.$.admin': true
      }
    })
  }

  static async top({from, to}) {
    const pipeline = require('./user').rankPipeline
    pipeline = pipeline.concat([{
      $skip: from
    },{
      $limit: to - from
    },{
      $project: {
        'name': 1,
        'picture': 1,
        'perf': 1,
        'rank': 1,
      }
    }])
    return DB.get('teams').aggregate(pipeline)
  }
}
