import { Game, Solo, Squad, Team, createGame } from '../../src/game'
import monk from 'monk'
import { DB } from '../../src/db'

jest.setTimeout(10000)

afterAll(async () => {
  //await DB.clearCollections('games')
  DB.close()
})

beforeAll(async () => {
  await DB.clearCollections('games')
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
