const debug = require('debug')('db_queries:chat')
const db = require('../utils/db')
const { PROJECTIONS } = require('../api/api')
const utils = require('../utils')

module.exports = {
  /*
    returns chats with messages with greater timestamp than time
  */
  async userChatsInfos({user, time}) {
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
}
