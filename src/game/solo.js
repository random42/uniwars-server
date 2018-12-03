import { Game } from './main'
import { DB } from '../db'
import { Utils } from '../utils'
import { soloMatch } from './rating'
import { models } from '../models'

const debug = require('debug')('game:solo')

export class Solo extends Game {

  async updatesAtEnd() {
    return Promise.all([
      super.updatesAtEnd(),
      this.updateRatings()
    ])
  }

  async updateRatings() {
    const p0 = this.side(0)[0]
    const p1 = this.side(1)[0]
    const [ perf0, perf1 ] = soloMatch(p0.perf, p1.perf, this.result)
    const update = (_id, perf) => {
      return DB.get('users').findOneAndUpdate(_id, {
        $set: {
          perf
        }
      })
    }
    return Promise.all([
      update(p0._id, perf0),
      update(p1._id, perf1)
    ])
  }


}
