const debug = require('debug')('game');
const Game = require('./main');
const db = require('../utils/db');
const Ratings = require('../utils/ratings');
const Utils = require('../utils');

class Team extends Game {
  constructor(arg) {
    super(arg);
    this.teams = arg.teams;
  }

  async answer() {
    try {
      await super.answer(ans);

      this.isOver() && this.end();
    } catch(err) {
      debug(err);
    }
  }

  async init() {
    let op = db.teams.find({
      _id: {$in: this.teams},
    },
    {
      name: 1,
      picture: 1,
      perf: 1
    }).then((t) => {
      this.teams = t;
    })
    await Promise.all([super.init(),op]);
  }

  async updateRatings() {
    let teams = await db.teams.find({_id: {$in: this.teams.map(t => t._id)}},['perf']);
    teams = Utils.stringifyIds(teams);
    let side0, side1
    if (teams[0]._id === this.teams[0]._id) {
      side0 = teams[0];
      side1 = teams[1];
    } else {
      side0 = teams[1];
      side1 = teams[0];
    }
    debug('old ratings')
    debug(side0.perf)
    debug(side1.perf)
    let ratings = Ratings.soloMatch(side0, side1, this.result);
    side0.perf = ratings.side0;
    side1.perf = ratings.side1;
    debug('new ratings')
    debug(side0.perf)
    debug(side1.perf)
    let ops = [side0,side1].map(u => {
      return db.teams.findOneAndUpdate(
        u._id,
        {
          $set: {
            perf: u.perf
          }
        }
      )
    })
    return Promise.all(ops);
  }
}


module.exports = Team;
