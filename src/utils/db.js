const secret = require('../../secret/db.json')
// TODO
const auth = secret.test
const database = require('monk')
(`mongodb://${auth.user}:${auth.password}@ds062797.mlab.com:62797/uniwars`)

const stringIdsMid = ({collection, monkInstance}) => next => (args, method) => {
  return next(args, method).then((doc) => {
    return JSON.parse(JSON.stringify(doc))
  })
}

database.addMiddleware(stringIdsMid)

export const db = {
  db: database,
  users: database.get("users"),
  unis: database.get("unis"),
  teams: database.get("teams"),
  games: database.get("games"),
  chats: database.get("chats"),
  questions: database.get("questions"),
  qriusity_questions: database.get("qriusity_questions"),
  open_trivia: database.get("open_trivia")
}
