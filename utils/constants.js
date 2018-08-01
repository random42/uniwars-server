/*
  Timeouts are measured in milliseconds
*/

module.exports = {
  MAX_QUESTIONS_RECORD: 300, // number of last questions that will not appear again to a user
  GAME_QUESTIONS: 5, // questions per game
  GAME_JOIN_TIMEOUT: 1000, // period of time in which all clients must join or refuse the created game
  GAME_START_TIMEOUT: 3000, // period of time between game start and first question submit
  GAME_ANSWER_TIMEOUT: 10000, // period of time to answer a question
  CHAT_MAX_MSG_LENGTH: 1024, // maximum characters per chat message
  DEFAULT_PERF: {
    rating: 1500,
    rd: 100,
    vol: 0.06
  },
  MAX_TEAM_MEMBERS: 5, // users in a team
  GROUP_CHAT_MAX_MEMBERS: 50,
  MAX_PAGE_RESULTS: 20,
  USERNAME_LENGTH: {
    MIN: 4,
    MAX: 20
  }
}
