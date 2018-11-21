/*
  Timeouts are measured in milliseconds
*/

/**
 * Number of last questions that will not appear again to a user
 */
export const MAX_QUESTIONS_RECORD = 300

/**
 * questions per game
 */
export const GAME_QUESTIONS = 5
export const GAME_JOIN_TIMEOUT = 1000 // period of time in which all clients must join or refuse the created game
export const GAME_START_TIMEOUT = 3000 // period of time between game start and first question submit
export const GAME_ANSWER_TIMEOUT = 10000 // period of time to answer a question
export const CHAT_MAX_MSG_LENGTH = 1024 // maximum characters per chat message
export const DEFAULT_PERF = {
  rating: 1500,
  rd: 100,
  vol: 0.06
}
export const MAX_TEAM_MEMBERS = 5 // users in a team
export const GROUP_CHAT_MAX_MEMBERS = 50
export const MAX_PAGE_RESULTS = 20
export const USERNAME_LENGTH = {
  MIN: 4,
  MAX: 20
}
