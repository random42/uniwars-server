import { Game, Solo, Squad, Team, createGame } from '../src/game'
import monk from 'monk'
import { db } from './config'


afterAll(async () => {
  await db.clearCollections('games')
})

beforeAll(async () => {
  await db.clearCollections('games')
})

const ID = () => {
  return monk.id().toString()
}

const TEST_GAME = {
  _id: 'asd',
  type: 'solo',
}

const INIT = {
  side0: [ID()],
  side1: [ID()],
  type: 'solo',
}


test('createGame', async () => {
  const g = await createGame(INIT.side0, INIT.side1, INIT.type)
  expect(g instanceof Solo).toBeTruthy()
})
