import Game from './main'
import db from '../utils/db'
import Ratings from '../utils/ratings'
import Utils from '../utils'
import crud from '../crud'

const debug = require('debug')('game:solo')

class Solo extends Game {
  constructor(arg) {
    super(arg)
  }

  async answer({user, question, answer}) {
    try {
      await super.answer(arguments[0])
      this.sendQuestion(user)
      this.isOver() && this.end().catch((err) => {
        console.log(err)
      })
    } catch(err) {
      debug(err)
    }
  }

  async atEndUpdateRatings() {
    let users = await db.users.find({_id: {$in: this.players.map(p => p._id)}},['perf']);
    let side0, side1
    if (users[0]._id === this.players[0]._id) {
      side0 = users[0]
      side1 = users[1]
    } else {
      side0 = users[1]
      side1 = users[0]
    }
    debug('old ratings')
    debug(side0.perf)
    debug(side1.perf)
    let ratings = Ratings.soloMatch(side0, side1, this.result)
    side0.perf = ratings.side0
    side1.perf = ratings.side1
    debug('new ratings')
    debug(side0.perf)
    debug(side1.perf)
    let ops = [side0,side1].map(u => {
      return db.users.findOneAndUpdate(
        u._id,
        {
          $set: {
            perf: u.perf
          }
        }
      )
    })
    return Promise.all(ops)
  }
}

export default Solo;
