// @flow

const debug = require('debug')('models:question')
import { Model } from './model'
import type { ID } from '../types'
import { DB } from '../db'
const { PROJECTIONS } = require('../../api/api');
import { utils } from '../utils'


export class Question extends Model {

  isRight(answer: string) {
    return answer === this.correct_answer
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

  static async hit() {

  }

  static async miss() {

  }
}
