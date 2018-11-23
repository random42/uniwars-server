import monk from 'monk'
const chance = require('chance')()


/**
 * Takes users and outputs teams docs.
 */
export function createTeams(users, usersPerTeam) {
  users = users.slice(0, users.length - (users.length % usersPerTeam))
  const numTeams = users.length / usersPerTeam
  const names = chance.unique(chance.word, numTeams)
  let teams = []
  let j = 0
  let team
  for (let i in users) {
    let u = users[i]
    if (i % usersPerTeam === 0) {
      team = {
        _id: monk.id(),
        name: names[j],
        users: [],
        perf: {
          rating: chance.floating({min: 1000, max: 2000}),
          rd: chance.integer({min: 15, max: 100}),
          vol: 0.06
        },
        news: [],
        games: {
          team: {
            wins: chance.integer({min: 50, max: 100}),
            losses: chance.integer({min: 50, max: 100}),
            draws: chance.integer({min: 50, max: 100}),
          }
        },
        chat: monk.id()
      }
      teams.push(team)
      j++
    }
    const founder = i % usersPerTeam === 0
    team.users.push({
      _id: u._id,
      admin: founder || chance.bool({ likelihood: 20 }),
      founder
    })
  }
  return teams
}
