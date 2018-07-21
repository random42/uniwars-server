const debug = require('debug')('db_queries:chat')
const db = require('../utils/db')
const { PROJECTIONS } = require('../api/api')
const utils = require('../utils')
const monk = require('monk')

const NO_PROJ = {projection: {_id: 1}}

module.exports = {
  /*
   * participants array has already admins
   * returns chat
  */
  async createChat({type, name, collection, participants}) {
    let chat = {
      _id: monk.id(),
      collection,
      type,
      name,
      messages: [],
      participants: participants.map((p) => {
        return { ...p, _id: monk.id(p._id)}
      })
    }
    return db.chats.insert(chat)
  },
  /*
    returns all user's chats with messages with greater timestamp than time
  */
  async upToDateChats({user, time}) {
    const pipeline = [
      {
        $match: {_id: user}
      },
      {
        $lookup: {
          from: 'chats',
          localField: 'private.chats',
          foreignField: '_id',
          as: 'chats'
        }
      },
      {
        $unwind: 'chats'
      },
      {
        $replaceRoot: '$chats'
      },
      {
        $project: {
          messages: {
            $filter: {
              input: '$messages',
              as: 'msg',
              cond: { $gt: [ "$$msg.time", time ] }
            }
          }
        }
      }
    ]
    return db.users.aggregate(pipeline);
  },

  async removeUsers({users, chat}) {
    let chatUpdate = db.chats.findOneAndUpdate(chat, {
      $pull: {
        participants: {
          $in: users.map(u => {
            _id: u
          })
        }
      }
    }, NO_PROJ)
    let userUpdate = db.users.update({
      _id: {
        $in: users
      }
    }, {
      $pull: {
        'private.chats': chat
      }
    }, {...NO_PROJ, multi: true})
    return Promise.all([chatUpdate,userUpdate])
  },

  async addUsers({users, chat}) {
    let chatUpdate = db.chats.findOneAndUpdate(chat, {
      $addToSet: {
        participants: {
          $each: users.map(u => {_id: monk.id(u)})
        }
      }
    }, NO_PROJ)
    let usersUpdate = db.users.update({
      _id: {
        $in: users
      }
    }, {
      $addToSet: {
        'private.chats': monk.id(chat)
      }
    }, {...NO_PROJ, multi: true})
    return Promise.all([chatUpdate,userUpdate])
  },

  async changeChatName({chat, name}) {
    return db.chats.findOneAndUpdate(chat, {
      $set: {
        name
      }
    }, NO_PROJ)
  },

  async deleteChat({chat}) {
    return db.chats.findOneAndRemove(chat)
  },
}
