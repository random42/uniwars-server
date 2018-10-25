import debug from 'debug')('db_queries:user'
import db from '../utils/db'
import monk from 'monk'
const { PROJECTIONS } = require('../../api/api');
import utils from '../utils'


/**
 * Outputs all documents sorted by perf.rating with 'rank'
 * field attached
 */
export const RANK_PIPELINE = [
    {
      $sort: {
        'perf.rating': -1
      }
    },
    {
      $group: {
        _id: null,
        doc: { $push: "$$ROOT" }
      }
    },
    {
      $unwind: {
        path: '$doc',
        includeArrayIndex: 'rank'
      }
    },
    {
      $project: {
        'doc.rank': '$rank'
      }
    },
    {
      $replaceRoot: { newRoot: '$doc' }
    }
  ]

class User {
  static async getFull({user}) {
    let pipeline = RANK_PIPELINE.concat([
      {
        $match: user
      },
      {
        $lookup: {
          from: 'unis',
          localField: 'uni',
          foreignField: '_id',
          as: 'uni'
        }
      },
      {
        $lookup: {
          from: 'teams',
          localField: 'teams',
          foreignField: '_id',
          as: 'teams'
        }
      },
      {
        $project: {
          email: 0,
          private: 0,
          activity: 0,
          'uni.alpha_two_code': 0,
          'uni.state_province': 0,
          'uni.domains': 0,
          'uni.chat': 0,
          'teams.users': 0,
          'teams.challenges': 0,
          'teams.games': 0,
          'teams.chat': 0,
          'teams.founder': 0
        }
      },
    ])
    let docs = db.users.aggregate(pipeline)
    if (docs.length === 0) return
    else return docs[0]
  }

  static async getSmall({user}) {
    let pipeline = [
      {
        $match: user
      },
      {
        $lookup: {
          from: 'unis',
          localField: 'uni',
          foreignField: '_id',
          as: 'uni'
        }
      },
      {
        project: {
          username: 1,
          'uni.name': 1,
          'uni.country': 1,
          major: 1,
          perf: 1,
          picture: 1
        }
      }
    ]
    let docs = db.users.aggregate(pipeline)
    if (docs.length === 0) return
    else return docs[0]
  }

  static async top({from, to}) {
    // adding $skip and $limit stages after $sort
    let pipeline = RANK_PIPELINE.concat([
      {
        $skip: from
      },{
        $limit: to-from
      }
    ])
    return db.users.aggregate(pipeline)
  }

  static async addOnlineTime({user, time}) {
    return db.users.findOneAndUpdate(user, {
      $inc: {
        'online_time': time
      }
    })
  }

  static async removeFriends({user, friends}) {
    let ops = [
      db.users.update({
        '_id': {
          $in: friends
        },
        'friends': user
      },{
        $pull: {
          'friends': user
        }
      },{
        multi: true
      }),
      db.users.findOneAndUpdate(user, {
        $pull: {
          'friends': {
            $in: friends
          }
        }
      })
    ]
    return Promise.all(ops)
  }
}

export default User
