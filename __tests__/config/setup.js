const path = require('path');

const fs = require('fs');

const { MongoMemoryServer } = require('mongodb-memory-server');

const mongod = new MongoMemoryServer({
  instance: {
    port: 57120,
    ip: '127.0.0.1',
    dbName: 'jest'
  },
  binary: {
    version: '3.6.6'
  },
  autoStart: false
})

module.exports = async () => {
  if (!mongod.isRunning) {
    await mongod.start();
  }
  // Set reference to mongod in order to close the server during teardown.
  global.__MONGOD__ = mongod;
}
