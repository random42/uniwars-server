const Game = require('../utils/game-model');

let game1 = new Game({side0: ['random'], side1: ['shorty'], type: 'solo'});
game1.create();
game1.join('random');
game1.join('shorty');

module.exports = {}
