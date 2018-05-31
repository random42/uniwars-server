const db = require('../../db');
const monk = require('monk');
const debug = require('debug')('game');

const classes = {
  'solo': require('./solo'),
  'squad': require('./squad'),
  'team': require('./team'),
}

const UTILS = {

  /*
    returns a new game initialized with right class
    side0/1 == array of user_ids strings
    teams == array of team_ids strings
  */
  create({side0, side1, teams, type}) {
    debug('creation', arguments[0]);
    return new classes[type](arguments[0]).create();
  },

  // fetch game and initialize it with right class
  async fetch(_id) {
    let game = await db.games.findOne(_id);
    if (!game) return;
    return new classes[game.type](game);
  }
}


module.exports = UTILS;