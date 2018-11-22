// @flow

const debug = require('debug')('models:team')
import { DB, Pipeline } from '../db'
import { Model } from './model'
import type { ID, Collection } from '../types'
import { User } from './user'
import monk from 'monk'
import { _ } from 'lodash/core'


export class Team extends Model {

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

  static DEFAULT_PERF = {
    rating: 1500,
    rd: 100,
    vol: 0.06
  }

  static async fetch(...args) {
    return Model.fetch(...args, Team)
  }

  static async create(name : string, founder: ID) : Promise<Team> {
    const obj = {
      _id: monk.id(),
      name,
      users: [
        {
          _id: founder,
          founder: true,
          admin: true
        }
      ],
      perf: Team.DEFAULT_PERF,
      games: {},
      news: []
    }
    const team = await DB.get('teams').insert(obj)
    return new Team(team)
  }

  static async delete(team: ID) : Promise<Team> {
    return DB.get('teams').findOneAndDelete(team)
  }

  static async addNews(...args) : Promise<Object> {
    return Model.addNews(...args, Team)
  }

  static async addMembers(team: ID, users: ID[]) {
    const array = users.map(u => {return { _id: u }})
    return DB.get('teams').findOneAndUpdate(team, {
      $push: {
        users: {
          $each: array
        }
      }
    }, {projection: {_id: 1}})
  }

  static async removeMembers(team: ID, users: ID[]) {
    return DB.get('teams').findOneAndUpdate(team, {
      $pull: {
        users: {
          _id: { $in: users }
        }
      }
    }, {projection: {_id: 1}})
  }

  static async makeAdmins(team : ID, users : ID[]) {
    return DB.get('teams').findOneAndUpdate({
      _id: team
    },{
      $set: {
        'users.$[targets].admin': true
      }
    }, {
      projection: {_id: 1},
      arrayFilters: [
        {
          "targets": {
            _id: {
              $in: users
            }
          }
        }
      ]
    })
  }

  /**
   * Team A challenges team B.
   * If there's already a challenge from A then
   * nothing will change. Else add news to B.
   *
   * @return News object
   */
  static async challenge(from: ID, to: ID, gameType: string) : Promise<Object> {
    // get team B making sure there's no similar challenge
    const query = {
      _id: to,
      news: {
        $elemMatch: {
          $not: {
            type: "challenge",
            team: from
          }
        }
      }
    }
    const news = {
      _id: monk.id(),
      type: "challenge",
      game_type: "team",
      team: from,
      created_at: Date.now()
    }
    const doc = await Model.addNews(news, query, Team)
    return news
  }

  static async top(...args) {
    return Model.top(...args, Team)
  }

  static isValidName(name : string) {
    return User.isValidUsername(name)
  }

  static async isFreeName(name : string) : Promise<boolean> {
    if (!Team.isValidName(name))
      return false
    const doc = await DB.get('teams').findOne({
      name
    }, { fields : { _id: 1 }})
    return doc ? true : false
  }

  static async areAdmin(team: ID, users: ID[]) : Promise<boolean> {
    const array = users.map(u => { return {_id: u, admin: true} })
    const doc = await DB.get('teams').findOne({
      _id: team,
      users: {
        $all: array
      }
    }, { fields : { _id: 1 }})
    return doc ? true : false
  }

  static async isFounder(team: ID, user: ID) : Promise<boolean> {
    const doc = await DB.get('teams').findOne({
      _id: team,
      users: {
        _id: user,
        founder: true
      }
    }, { fields : { _id: 1 }})
    return doc ? true : false
  }

  static async onlineUsers(team: ID) :
    Promise<Array<{_id: ID, admin: boolean, founder: boolean}>> {
    const docs = await DB.get('teams').aggregate([
      {
        $match: { _id: team },
      },
      {
        $unwind: "$users"
      },
      {
        $lookup: {
          from: "users",
          localField: "users._id",
          foreignField: "_id",
          as: "doc"
        }
      }, {
        $match: {
          'doc.online': true
        }
      },{
        $replaceRoot: {
          newRoot: "$users"
        }
      }
    ])
    return docs
  }
}
