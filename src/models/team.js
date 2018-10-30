const debug = require('debug')('models:team')
import { db } from '../utils/db'
import { Model } from './model'
import type { ID } from '../types'
import monk from 'monk'
import { _ } from 'lodash/core'
const { PROJECTIONS } = require('../../api/api');
import { utils } from '../utils'

const { DEFAULT_PERF } = require('../constants')

export class Team extends Model {

  static async fetchWithUsers(query) {
    let pipeline = [
      {
        $match: query,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'users',
          foreignField: '_id',
          as: 'users'
        }
      },
      {
        $project: {
          'name': 1,
          'picture': 1,
          'perf': 1,
          'games': 1,
          'founder': 1,
          'users._id': 1,
          'users.username': 1,
          'users.picture': 1,
          'users.perf': 1,
        }
      },
    ]
    let docs = await db.teams.aggregate(pipeline)
    if (docs.length !== 1) return
    else return docs[0]
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
    let team = db.teams.insert({
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
    let chat = db.chats.insert({
      _id: chat_id,
      collection: "teams",
      type: "group",
      name,
      messages: [],
      participants: users
    })
    let updateUsers = db.users.update({
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
    let doc = await db.teams.findOne(team)
    if (!doc) return
    return Promise.all([
      // remove team from users
      db.users.update(
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
      db.teams.findOneAndDelete(team)
    ])
  }

  static async addMember({team, user}) {
    let updates = [
      db.teams.findOneAndUpdate(team,{
        $push: {
          users: {
            _id: monk.id(user),
            admin: false
          }
        }
      }),
      db.users.findOneAndUpdate(user,{
        $addToSet: {
          teams: monk.id(team)
        }
      })
    ]
    return Promise.all(updates)
  }

  static async removeMember({team, user}) {
    let updates = [
      db.teams.findOneAndUpdate(team,{
        $pull: {
          users: {
            _id: monk.id(user)
          }
        }
      }),
      db.users.findOneAndUpdate(user,{
        $pull: {
          teams: monk.id(team)
        }
      })
    ]
    return Promise.all(updates)
  }

  static async makeAdmin({team, user}) {
    return db.teams.findOneAndUpdate({
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
    return db.teams.aggregate(pipeline)
  }
}
