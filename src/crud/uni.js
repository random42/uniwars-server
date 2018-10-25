import debug from 'debug')('db_queries:uni'
import db from '../utils/db'
import monk from 'monk'
const { PROJECTIONS } = require('../../api/api');
import utils from '../utils'
const RANK_PIPELINE = [
    {
      $group: {
        _id: "$uni",
        rating: { $avg: "$perf.rating" },
        users_count: { $sum: 1 }
      }
    },
    {
      $sort: {
        rating: -1
      }
    },
    {
      $group: {
        _id: null,
        uni: { $push: "$$ROOT" }
      }
    },
    {
      $unwind: {
        path: '$uni',
        includeArrayIndex: "rank"
      }
    },
    {
      $lookup: {
        from: 'unis',
        localField: 'uni._id',
        foreignField: '_id',
        as: 'doc'
      }
    },
    {
      $project: {
        'doc.rank': '$rank',
        'doc.rating': '$uni.rating',
        'doc.users_count': '$uni.users_count'
      }
    },
    {
      $replaceRoot: { newRoot: '$doc' }
    }
  ]

class Uni {

  static async getFull({uni}) {
    const projection = {
      alpha_two_code: 0,
      'state-province': 0,
      domains: 0,
      chat: 0
    }
    let pipeline = RANK_PIPELINE.concat([{
      $match: { _id: uni }
    },{
      $project: projection
    }])
    let doc = await db.users.aggregate(pipeline)
    if (doc.length === 0) {
      doc = await db.unis.findOne(uni, projection)
      return doc
    } else {
      return doc[0]
    }
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
}

export default Uni
