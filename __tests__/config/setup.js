const { MongoMemoryServer } = require('mongodb-memory-server')
const monk = require('monk')

const mongod = new MongoMemoryServer({
  instance: {
    dbName: 'jest'
  },
  binary: {
    version: '3.6.6'
  },
  autoStart: false
})

async function setup() {
  if (!mongod.isRunning)
    await mongod.start()
  const uri = await mongod.getConnectionString()
  process.env.MONGO_URI = uri
  global.MONGOD = mongod
}

module.exports = setup
