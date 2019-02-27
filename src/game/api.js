import { id } from 'monk';
import { Model, Question, User, Team, Game as DB } from '../models'
import type { ID, GameType, Perf, GameResult, GameStatus } from '../types'
import { game as nsp } from '../socket';
import { mm } from '../utils';
import Utils, { Rating } from '../utils'
import _ from 'lodash/core'
const debug = require('debug')('game:api')

export class GameApi {

}
