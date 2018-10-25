const debug = require('debug')('game:team')
import Game from './main';
import db from '../utils/db';
import Ratings from '../utils/ratings';
import Utils from '../utils';

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
  }
}


export default Team;
