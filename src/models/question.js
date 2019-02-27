// @flow

const debug = require('debug')('models:question')
import { Model } from './model'
import type { ID } from '../types'
import { DB } from '../db'
const { PROJECTIONS } = require('../../api/api');
import { utils } from '../utils'


export class Question extends Model {


  /**
   * Fetch questions
   * @param count number of questions to fetch
   * @param users avoid questions those users answered recently
   * @param leastAnswered take least answered questions first, otherwise fetch them randomly
   */
  static async fetch(
    count: number,
    users: ID[],
    leastAnswered: boolean
  ) {
    // query last questions from users
    const avoid = await DB.get('users').aggregate([
      {$match: {_id: {$in: users}}},
      {$unwind: "$private.last_questions"},
      {$group: {
        _id: "$private.last_questions",
        users: {
          $addToSet: "$_id"
        }
      }},
      {$replaceRoot: { newRoot: "$_id" } }
    ])
    const match = ([
      {
        $match: {
          _id: { $nin: avoid }
        }
      }
    ]
    const sorted = [
      {
        $sort: {
          total: 1
        }
      },
      {
        $limit: count
      }
    ]
    const random = [
      {$sample: {size: count}}
    ]
    let pipeline;
    if (leastAnswered) {
      pipeline = match.concat(sorted);
    }
    else pipeline = match.concat(random);
    // query a sample of questions that don't match with users' last questions
    return DB.get('questions').aggregate(pipeline);
  }

  isRight(answer: string) {
    return answer === this.answers[this.correct_answer];
  }
  /**
   * Adds hit/miss
   */
  async answer(user: ID, answer: string) {
    const field = this.isRight(answer) ? 'hit' : 'miss'
    const updates = [
        DB.get('questions').findOneAndUpdate(this._id, {
          $inc: {
            [field]: 1
          }
        }),
        DB.get('users').findOneAndUpdate(user, {
          $inc: {
            ['stats.' + this.subject + '.' + field]: 1
          }
        })
    ]
    return Promise.all(updates)
  }

}
