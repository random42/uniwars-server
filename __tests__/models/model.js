import { User, Uni, Major, Pipeline, Model } from '../../build_flow/models'
import monk from 'monk'
import _ from 'lodash'
const USERS = require('../../data/users.json')
const [ A, B ] = USERS

test('constructor', () => {
  const obj = A
  const m = new Model(obj)
  expect(m).toEqual(obj)
  const id = obj._id
  expect(typeof (new Model(id)._id)).toMatch('object')
})
