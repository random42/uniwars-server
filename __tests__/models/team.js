import { User, Team, Model } from '../../build_flow/models'
import { DB } from '../../build_flow/db'
import { createTeams } from '../../build_flow/scripts/data_ops'
import _ from 'lodash'
import monk from 'monk'
import DATA from '../../data'

let [ A, B, C, D, E ] = DATA.USERS

const pushTeams = async (number, usersPerTeam) => {
  const users = DATA.USERS.slice(0, number * usersPerTeam)
  const teams = createTeams(users, usersPerTeam)
  return DB.get('teams').insert(teams)
}


describe('local', () => {
  test('constructor', () => {
  })
})

describe.skip('crud', () => {
  beforeEach(async () => {
    await DB.clearCollections('users', 'teams')
    await DB.putSomeUsers(15)
  })

  afterAll(async () => {
    await DB.clearCollections('users', 'teams')
  })

  test('some-things', async () => {
    const users = DATA.USERS.slice(0,5).map(u => u._id)
    const name = "asdf"
    const founder = A._id
    expect(founder).toBe(users[0])
    const team = await Team.create(name, founder)
    const id = team._id
    await Team.addMembers(id, users.slice(1,3))
    // await DB.logDoc(id, 'teams')
    expect(await Team.areMembers(id, users.slice(0,3)))
    .toBe(true)
    expect(await Team.areMembers(id, users.slice(0,4)))
    .toBe(false)
    expect(await Team.areAdmins(id, [founder]))
    .toBe(true)
    expect(await Team.areAdmins(id, users.slice(0,3)))
    .toBe(false)
    expect(await Team.isFounder(id, founder))
    .toBe(true)
    await Team.makeAdmins(id, users.slice(1,2))
    // await DB.logDoc(id, 'teams')
    expect(await Team.areAdmins(id, users.slice(0,2)))
    await Team.removeAdmins(id, users.slice(1,2))
    expect(await Team.areAdmins(id, users.slice(0,2)))
    .toBe(false)
  })

  test('challenge', async () => {
    const [ X, Y ] = await pushTeams(2, 5)
    const challenge = await Team.challenge(X._id, Y._id, 'team')
    const sec = await Team.challenge(X._id, Y._id, 'team')
    expect(sec).toBe(null)
    const news = await Model.pullNews(Y._id, challenge._id, Team)
    expect(news).toEqual(challenge)
  })
})
