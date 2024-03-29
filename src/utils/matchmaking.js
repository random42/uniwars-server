import monk from 'monk';
const debug = require('debug')('mm')
import { createGame } from '../game'

// 1v1
class Solo {
  constructor() {
    this.queue = []
  }

  push(users) {
    debug('Pushing', users)
    let length
    // one user
    if (typeof users === 'string') {
      length = this.queue.push(users);
    } else { // array of users
      this.queue = this.queue.concat(users)
      length = this.queue;
    }
    // match instantly
    if (length === 2) this.match();
  }

  pull(user) {
    debug('Pulling',user)
    this.queue.splice(this.queue.indexOf(user),1);
  }

  match() {
    let players = this.queue.splice(0,2)
    const side0 = [players[0]]
    const side1 = [players[1]]
    debug('Matching',players);
    createGame(side0, side1, 'solo');
  }
}

// 5v5
class Squad {
  constructor() {
    this.queue = [];
  }

  push(users) {
    debug('Pushing',users)
    let length;
    // one user
    if (typeof users === 'string') {
      length = this.queue.push(users);
    } else { // array of users
      this.queue = this.queue.concat(users)
      length = this.queue;
    }
    // match instantly
    if (length === 10) this.match()
  }

  pull(user) {
    this.queue.splice(this.queue.indexOf(user),1);
  }

  match() {
    let players = this.queue.splice(0,10)
    const side0 = players.slice(0,5);
    const side1 = players.slice(5,10);
    debug('Matching',side0,side1)
    createGame(side0, side1, 'squad')
  }
}


export const mm = {
  "solo": new Solo(),
  "squad": new Squad(),
}
