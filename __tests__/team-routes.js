const app = require('request')(require('../app'))
const API = require('../../api/api').HTTP

test('/route', () => {
  expect('a').toBe('a')
})

// describe('/team', () => {
//   test('/', async () => {
//     const req = API.TEAM.GET
//     app[req.method](req.url)
//     .query({_id: ''})
//     .expect(200, {
//
//     })
//   })
// })
