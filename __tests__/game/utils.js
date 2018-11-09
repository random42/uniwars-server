import { Game, Solo, Squad, Team, createGame } from '../../build_flow/game'
import monk from 'monk'
import { DB } from '../../build_flow/db'

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
