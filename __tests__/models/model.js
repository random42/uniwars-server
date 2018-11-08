import { User, Uni, Major, Pipeline, Model } from '../../src/models'
import monk from 'monk'
import _ from 'lodash'
const USERS = require('../../data/users.json')

test('constructor', () => {
  const obj = USERS[0]
  const m = new Model(obj)
  expect(_.isMatch(m, obj)).toBeTruthy()
  const id = obj._id
  expect(typeof (new Model(id)._id)).toMatch('object')
})
