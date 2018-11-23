// @test-environment env

import { User, Uni, Major, Model } from '../../build_flow/models'
import { DB } from '../../build_flow/db'
import _ from 'lodash'
import monk from 'monk'
import DATA from '../../data'

const DEFAULT_USERS = 10
// two random users
let [ A, B ] = DATA.USERS

describe('local', () => {
  test('constructor', async () => {
    const m = new User(A)
    expect(m).toEqual(A)
  })
})

describe('crud', () => {

  beforeEach(async () => {
    await DB.clearCollections('users')
    await DB.putSomeUsers(DEFAULT_USERS)
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
    let friendship = await User.areFriends(A._id, B._id)
    expect(friendship).toBe(false)
    await User.createFriendship(A._id, B._id)
    friendship = await User.areFriends(A._id, B._id)
    expect(friendship).toBe(true)
    const friends = await User.getFriends(B._id, 0, 10)
    expect(friends.length).toBe(1)
    expect(_.has(friends[0], 'friendship')).toBeTruthy()
    await User.removeFriendship(A._id, B._id)
    friendship = await User.areFriends(A._id, B._id)
    expect(friendship).toBe(false)
    const request = await User.friendRequest(A._id, B._id)
    const news2 = await User.friendRequest(A._id, B._id)
    expect(news2).toBe(null)
    const news = await Model.pullNews(B._id, request._id, User)
    expect(news).toEqual(request)
  })

  test('fetch', async () => {
    let docs = await User.fetch({}, 'FULL')
    expect(docs.length).toBe(DEFAULT_USERS)
    _.forEach(docs, (item, index, arr) => {
      // check rating sort
      expect(item.rank).toEqual(index)
      if (index > 0)
        expect(item.perf.rating).toBeLessThanOrEqual(arr[index - 1].perf.rating)
    })
  })

  test('username', async () => {
    expect(
      User.isValidUsername('_asd123')
    ).toBe(false)
    expect(
      User.isValidUsername('a')
    ).toBe(false)
    expect(
      User.isValidUsername('ASDF')
    ).toBe(true)
    expect(
      User.isValidUsername('a_13')
    ).toBe(true)
    expect(
      User.isValidUsername('1234')
    ).toBe(false)
    expect(
      await User.isFreeUsername(A.username)
    ).toBe(false)
    expect(
      await User.isFreeUsername('qwertyuiop')
    ).toBe(true)
  })

  test('challenge', async () => {
    const challenge = await User.challenge(A._id, B._id, 'solo')
    const sec = await User.challenge(A._id, B._id, 'solo')
    expect(sec).toBe(null)
    const news = await Model.pullNews(B._id, challenge._id, User)
    expect(challenge).toEqual(news)
  })
})
