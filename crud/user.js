const debug = require('debug')('db_queries:user')
const db = require('../utils/db')
const { PROJECTIONS } = require('../api/api');
const utils = require('../utils')

module.exports = {
  async getFull({user}) {
    let pipeline = this.rankPipeline.concat([
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
  },

  async getSmall({user}) {
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
  },

  async top({from, to}) {
    // adding $skip and $limit stages after $sort
    let pipeline = this.rankPipeline.concat([
      {
        $skip: from
      },{
        $limit: to-from
      }
    ])
    return db.users.aggregate(pipeline)
  },

  async rank() {

  },

  rankPipeline: [
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
}
