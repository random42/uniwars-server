import { User, Uni, Major, Pipeline, Model } from '../../build_flow/models'
import { DB } from '../../build_flow/db'
import _ from 'lodash'
import monk from 'monk'
import { DATA } from '../config'
// two random users
let [ A, B ] = DATA.USERS

describe('local', () => {
  test('constructor', async () => {
    const m = new User(A)
    expect(_.isMatch(m, A)).toBeTruthy()
    const id = A._id
  })
})

describe('db', () => {

  beforeEach(async () => {
    await DB.clearCollections('users')
    await DB.putSomeUsers(10)
  })

  afterAll(async () => {
    await DB.clearCollections('users')
  })

  test('addOnlineTime', async () => {
    const time = 100
    await User.addOnlineTime(A._id, time)
    const doc = await DB.get('users').findOne(A._id, {returnOriginal: false})
    expect(doc.online_time).toBe(A.online_time + time)
  })

  test('friendship', async () => {
    //await User.createFriendship()
    expect(0).toBe(0)
  })
})
