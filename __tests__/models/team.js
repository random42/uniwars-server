import { User, Uni, Major, Pipeline, Model } from '../../build_flow/models'
import { DB } from '../../build_flow/db'
import _ from 'lodash'
import monk from 'monk'
import DATA from '../../data'

let [ A, B, C, D, E ] = DATA.USERS


describe('local', () => {
  test('constructor', () => {
  })
})

describe('crud', () => {

  beforeEach(async () => {
    await DB.clearCollections('users', 'teams')
    await DB.putSomeUsers(15)
  })

  afterAll(async () => {
    await DB.clearCollections('users', 'teams')
  })

  test('function', async () => {
    expect(0).not.toBe(1)
  })
})
