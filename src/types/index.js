// @flow


export type ID = string
export type Category = string
export type Difficulty = 'easy' | 'medium' | 'hard'
export type GameType = 'solo' | 'squad' | 'team'
export type Collection = 'users' | 'unis' | 'teams' | 'questions' | 'games'
export type Perf = { rating: number, rd: number, vol: number }
export type GameResult = 0 | 0.5 | 1
export type GameStatus = 'create' | 'play' | 'end'
