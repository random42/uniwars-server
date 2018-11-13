import { User, Uni, Major, Pipeline, Model } from '../../build_flow/models'
import { DB } from '../../build_flow/db'
import _ from 'lodash'
import monk from 'monk'
import { DATA } from '../config'

let [ A, B, C, D, E ] = DATA.USERS


describe('local', () => {
  test('constructor', () => {
  })
})

describe('crud', () => {

  beforeEach(async () => {
    // await DB.clearCollections('users')
    // await DB.putSomeUsers(10)
  })

  afterAll(async () => {
    //await DB.clearCollections('users')
  })

  test('function', async () => {
    expect(0).not.toBe(1)
  })
})
