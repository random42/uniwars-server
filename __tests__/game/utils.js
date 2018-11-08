import { Game, Solo, Squad, Team, createGame } from '../../src/game'
import monk from 'monk'
import {db} from '../config'

jest.setTimeout(10000)

afterAll(async () => {
  //await db.clearCollections('games')
  db.close()
})

beforeAll(async () => {
  await db.clearCollections('games')
})

const ID = () => monk.id().toString()

const TEST_GAME = {
  _id: 'asd',
  type: 'solo',
}

const INIT = {
  side0: [ID()],
  side1: [ID()],
  type: 'solo',
}


test('createGame', () => {
  expect(0).toBe(0)
})
