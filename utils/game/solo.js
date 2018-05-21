const debug = require('debug')('game');
const Game = require('./main');

class Solo extends Game {
  constructor(arg) {
    super(arg)
  }

  async answer(ans) {
    try {
      await super.answer(ans);
      this.sendQuestion(ans.user);
      this.isOver() && this.end();
    } catch(err) {
      debug(err);
    }
  }

  async updateRatings() {

  }
}

module.exports = Solo;
