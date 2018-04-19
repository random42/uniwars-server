const socket = require('./game');
const db = require('../db');
const monk = require('monk');

// 1v1
class Solo {
  constructor() {
    this.queue = [];
  }

  push(users) {
    console.log('Pushing',users)
    let length;
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
    console.log('Pull write')
    this.queue.splice(this.queue.indexOf(user),1);
  }

  match() {
    let players = this.queue.splice(0,2)
    const side0 = players[0]
    const side1 = players[1]
    console.log('Matching',players);
    //utils.createGame({type: "solo",side0,side1,players: side0.concat(side1)})
  }
}

// 5v5
class Squad {
  constructor() {
    this.queue = [];
  }

  push(users) {
    console.log('Pushing',users)
    let length;
    // one user
    if (typeof users === 'string') {
      length = this.queue.push(users);
    } else { // array of users
      this.queue = this.queue.concat(users)
      length = this.queue;
    }
    // match instantly
    if (length === 10) this.match();
  }

  pull(user) {
    this.queue.splice(this.queue.indexOf(user),1);
  }

  match() {
    let players = this.queue.splice(0,10)
    const side0 = players.slice(0,5);
    const side1 = players.slice(5,10);
    console.log('Matching',side0,side1);
    //utils.createGame({type: "squad",side0,side1,players: side0.concat(side1)})
  }
}


module.exports = {
  "solo": new Solo(),
  "squad": new Squad(),
}
