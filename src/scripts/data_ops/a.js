const fs = require('fs')
const _ = require('lodash')
const monk = require('monk')
const chance = new (require('chance'))()
let USERS = require('../../data/users_1000.json')

let DEL = ['picture','password','rating', 'major.category', 'major.FOD1P']

const OUT = USERS.map(u => {
  let obj = _.merge(u, {
    type: chance.pickone(['student','generic','teen','worker']),
    stats: [],
    teams: [],
    perf: {
      rating: chance.floating({min: 1000, max: 2000}),
      rd: chance.integer({min: 15, max: 100}),
      vol: 0.06
    },
    friends: [],
    news: [],
  })
  obj.uni = _.pick(u.uni, ['_id','name'])
  obj = _.set(obj, 'major._id', monk.id().toString())
  obj = _.omit(obj, DEL)
  return obj
})


fs.writeFileSync('./output/users.json', JSON.stringify(OUT, null, '\t'))
