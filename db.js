const database = require('monk')('mongodb://roberto.sero:6a2snh8QphPrrsuZ@ds062797.mlab.com:62797/uniwars');


module.exports = {
  db: database,
  users: database.get("users"),
  unis: database.get("unis"),
  teams: database.get("teams"),
  game: database.get("game"),
  qriusity_questions: database.get("qriusity_questions"),
  open_trivia: database.get("open_trivia"),
}
