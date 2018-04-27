const db = require('../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const namespace = require('./socket.io/game');
const mm = require('./matchmaking');

module.exports = {
  findIndexById(array,id) {
    for (let i in array) {
      if (array[i]._id === id) {
        return i
      }
    }
    return -1
  },

  findObjectById(array,id) {
    for (let i of array) {
      if (i._id === id) {
        return i
      }
    }
    return false
  },

  findObjectByKey(array,key,value) {
    for (let i of array) {
      if (i[key] === value) {
        return i
      }
    }
    return false
  },

  stringifyIds(obj) {
    return JSON.parse(JSON.stringify(obj))
  }
}
