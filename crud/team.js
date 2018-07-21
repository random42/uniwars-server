const debug = require('debug')('db_queries:team')
const db = require('../utils/db')
const monk = require('monk')
const _ = require('lodash/core')
const { PROJECTIONS } = require('../api/api');
const utils = require('../utils')

const { DEFAULT_PERF } = require('../utils/constants')

module.exports = {

  /*
    assumes that founder is not in users array
    creates the team and the team chat
    returns team doc
  */
  async create({name, users, founder}) {
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
      _id: { $in: users.map(u => u._id)}
    },{
      $addToSet: {
        teams: team_id
      }
    })
    let res = await Promise.all([team,chat])
    return res[0]
  },

  async delete({team}) {
    return db.teams.findOneAndDelete(team)
  },

  async addMember({team, user}) {
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
  },

  async removeMember({team, user}) {
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
  },

  async makeAdmin({team, user}) {
    return db.teams.findOneAndUpdate({
      _id: team,
      users: { _id: user }
    },{
      $set: {
        'users.$.admin': true
      }
    })
  },


}
