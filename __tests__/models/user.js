import { User, Uni, Major, Pipeline, Model } from '../../src/models'
import { DB } from '../../src/db'
import _ from 'lodash'
import monk from 'monk'

// two random users
let [ A, B ] = DB.getUsers(0, 2)

beforeEach(async () => {
  await DB.clearCollections('users')
  await DB.putSomeUsers(10)
})

afterAll(async () => {
  await DB.clearCollections('users')
  await DB.close()
})

//
// test('constructor', async () => {
//   const m = new User(A)
//   //console.log(m)
//   expect(_.isMatch(m, A)).toBeTruthy()
//   const id = A._id
//   expect(typeof (new Model(id)._id)).toMatch('object')
// })

test('addOnlineTime', async () => {
  const time = 100
  await User.addOnlineTime(A._id, time)
  const doc = await DB.get('users').findOne(A._id, {returnOriginal: false})
  expect(doc.online_time).toBe(A.online_time + time)
})

test.skip('friendship', async () => {
  //await User.createFriendship()
  expect(0).toBe(0)
})
