const Game = require('../utils/game-model');

let game1 = new Game(['random'],['shorty'],'solo');
game1.create();
game1.join('random');
game1.join('shorty');

module.exports = {}
