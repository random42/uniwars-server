import { User, Uni, Major, Pipeline, Model } from '../../src/models'
import {db} from '../config'
import _ from 'lodash'
import monk from 'monk'

// two random users
let [ A, B ] = db.getUsers(0, 2)

beforeEach(async () => {
  await db.clearCollections('users')
  await db.putSomeUsers(10)
})

afterAll(async () => {
  await db.clearCollections('users')
  await db.close()
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
  const doc = await db.get('users').findOne(A._id, {returnOriginal: false})
  expect(doc.online_time).toBe(A.online_time + time)
})

test.skip('friendship', async () => {
  //await User.createFriendship()
  expect(0).toBe(0)
})
