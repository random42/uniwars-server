// @flow
const debug = require('debug')('models:uni')
import { Model } from './model'
import { DB } from '../db'
import type { ID } from '../types'
import monk from 'monk'
const { PROJECTIONS } = require('../../api/api');
import { utils } from '../utils'


export class Uni extends Model {

  static SORT = {
    USERS_RATING: {
      avg_rating: -1,
      num_users: -1
    }
  }

  static PIPELINES = {
    RANK_BY_AVG_USERS_RATING: [
      {
        $group: {
          _id: "$uni._id",
          avg_rating: { $avg: "$perf.rating" },
          num_users: { $sum: 1 }
        }
      },
      {
        $sort: {
          avg_rating: -1,
          num_users: -1
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
          includeArrayIndex: "uni.rank"
        }
      },
      {
        $replaceRoot: { newRoot: "$uni" }
      }
    ]
  }

  static QUERY = {
    FULL : {
      collection: 'users',
      prepend: Uni.PIPELINES.RANK_BY_AVG_USERS_RATING,
      append: [
        {
          $lookup: {
            from: 'unis',
            localField: '_id',
            foreignField: '_id',
            as: 'doc'
          }
        },
        {
          $addField: {
            'doc.avg_rating': "$avg_rating",
            'doc.rank': "$rank",
            'doc.num_users': "$num_users"
          }
        },
        {
          $replaceRoot: { newRoot: "$doc" }
        }
      ],
      project: {
        web_pages: 1,
        name: 1,
        alpha_two_code: 1,
        country: 1,
        domains: 1,
        avg_rating: 1,
        num_users: 1
      }
    },
    SMALL : {
      project: {
        name: 1,
        alpha_two_code: 1,
        country: 1,
        avg_rating: 1,
        num_users: 1
      }
    }
  }



  /**
   * Only use this to match by _id, avg_rating or num_users because
   * lookup is done after match.
   */
  async fetch(
    match : Object,
    projection: string
    ) : Promise<Uni[]> {
    return Model.fetch(...args, Uni)
  }

  static async top(
    skip : number,
    limit : number,
    ) : Promise<Uni[]> {
    const { project } = Uni.QUERY.SMALL
    const { append } = Uni.QUERY.FULL
    const pipeline = [
      ...Uni.PIPELINES.RANK_BY_AVG_USERS_RATING,
      {
        $skip: skip
      },
      {
        $limit: limit
      },
      ...append,
      {
        $project: project
      }
    ]
    return DB.get('users').aggregate(pipeline)
  }
}
