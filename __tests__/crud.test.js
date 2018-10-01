const crud = require('../crud')
const config = require('./config')
const {db} = config

beforeAll(async () => {
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

describe('chat', () => {
  test('createChat', async () => {

    const chat = {
      type: 'group',
      collection: 'users',
      name: 'a',
      participants,
    }
    const doc = await crud.chat.createChat(chat)
    expect(doc).toMatchObject(chat)
  })
})
