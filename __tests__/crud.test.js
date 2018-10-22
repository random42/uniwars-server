const crud = require('../crud')
const config = require('./config')
const {db} = config

beforeAll(async () => {
  await db.db
  await db.clearDatabase()
  await db.putSomeUsers(100)
})

afterAll(async () => {
  await db.clearDatabase()
})

const participants = db.getUsers(0, 20)
  .map((i) => {
    return {
      _id: i._id,
    }
})

// test('a', async () => {
//
// })

describe('', () => {

})
