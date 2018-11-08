import { db } from '../config'
import _ from 'lodash'

const [ A , B ] = db.getUsers(0,2)

beforeEach(async () => {
  await db.clearCollections('users')
})

afterAll(async () => {
  await db.clearCollections('users')
  await db.close()
})

test('db-utils', async () => {
  await db.putSomeUsers(10)
  let users = await db.get('users').aggregate([])
  expect(users.length).toBe(10)
  let a = _.find(users, {username: A.username})
  expect(JSON.stringify(a))
  .toMatch(JSON.stringify(A))
  await db.clearCollections('users')
  users = await db.get('users').aggregate([])
  expect(users.length).toBe(0)
})
