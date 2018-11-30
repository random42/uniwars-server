// @flow

import monk from 'monk'

export type ID = string
export type UserType = 'teen' | 'student' | 'worker' | 'generic'
export type Category = string
export type GameType = 'solo' | 'squad' | 'team' | 'live'
export type Collection = 'users' | 'unis' | 'teams' | 'questions' | 'games'
export type Perf = { rating: number, rd: number, vol: number }
export type GameResult = 0 | 0.5 | 1
export type GameStatus = 'create' | 'play' | 'end'
export type UserNewsType = 'friend_request' | 'solo_challenge'
export type Socket = Object
