import db from '../utils/db';
import monk from 'monk';
const debug = require('debug')('game:utils')
import crud from '../crud'

const classes = {
  'solo': require('./solo'),
  'squad': require('./squad'),
  'team': require('./team'),
}

const UTILS = {
  /**
   * Creates a game.
   *
   * @param {Object} game
   * @param {string[]} game.side0 Users' _ids of first team
   * @param {string[]} game.side1 Second team
   * @param {string[]} game.teams _ids of teams (if it is a team game)
   * @param {string} game.type Game type
   * @return {Game} Game initialized with the right class
   */
  create({side0, side1, teams, type}) {
    debug('creation', arguments[0]);
    return new classes[type](arguments[0]).create();
  },

  // fetch game and initialize it with right class
  async fetch(_id) {
    let game = await crud.Game.fetchWithQuestions({game: _id})
    if (!game) return Promise.reject("Game does not exist!")
    return new classes[game.type](game)
  }
}


export default UTILS;
