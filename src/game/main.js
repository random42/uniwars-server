// @flow

import type { ID, GameType } from '../types'
import { DB } from '../db';
import { id } from 'monk';
import { Model, Question, User, Team } from '../models'
import type { ID, GameType, Perf, GameResult, GameStatus } from '../types'
import { game as nsp } from '../socket';
import { mm } from '../utils';
import Utils, { Rating } from '../utils'
import _ from 'lodash/core'
const debug = require('debug')('game:main')
import {
  MAX_QUESTIONS_RECORD,
  GAME_QUESTIONS,
  GAME_JOIN_TIMEOUT,
  GAME_START_TIMEOUT,
  GAME_ANSWER_TIMEOUT
} from '../constants'


export class Game extends Model {

  static COLLECTION = 'games'

  /**
   * Start game by checking players' connection and sending 'new_game'
   * event.
   */
  start() : Game {
    // checks all players are connected, if not...
    debug('start', this._id)
    let conns = this.connected()
    if (conns.length < this.players.length) {
      debug(this._id, 'Not all players are connected')
      return
    }
    // creating game room
    nsp.joinRoom(this.playersIds(), this._id)
    // emitting new_game message
    this.emit('new_game', {_id: this._id, type: this.type});
    return this
  }

  /**
   * Called when player sends 'join' message. Returns true on success
   */
  async join(user : ID) : boolean {
    let player = this.getPlayer(user)
    const check =
      this.status === 'create' &&
      player
    if (!check) return false
    player.joined = true
    await DB.get('games').findOneAndUpdate({
      _id: this._id,
      players: {
        $elemMatch: {
          _id: user
        }
      }
    },{
      $set: {
        'players.$.joined': true
      }
    })
    if (this.allPlayersHaveJoined())
      this.play()
    return true
  }

  /**
   * Sets questions by choosing ones that none of the players
   * have seen recently and updates game in db.
   */
  async createQuestions() {
    // query last questions from users
    const lastQuestions = await DB.get('users').aggregate([
      {$match: {_id: {$in: this.playersIds()}}},
      {$unwind: "$private.last_questions"},
      {$group: {
        _id: "$private.last_questions",
        users: {
          $addToSet: "$_id"
        }
      }}
    ])
    // query a sample of questions that don't match with users' last questions
    const questions = await DB.get('questions').aggregate([
      {$match: {
        _id: {$nin: lastQuestions.map(q => q._id)}
      }},
      {$sample: {size: GAME_QUESTIONS}},
    ])
    await DB.get('games').findOneAndUpdate(this._id, {
      $set: {
        questions
      }
    })
    this.questions = questions
    // couldn't quite do it with one aggregation pipeline
  }


  /**
   * Should not be used because users' properties are saved in 'players'
   * while the game is on.
   */
  async fetchUsers(projection : Object) : Promise<User[]> {
    const docs = await DB.get('users').find({
      _id: {
        $in: this.playersIds()
      }
    },
    {
      multi: true,
      fields: projection
    })
    return docs.map(User)
  }


  /**
   * Called after all players have joined. Emits 'game_start' event
   * and send first question after GAME_START_TIMEOUT
   */
  async play() {
    this.status = 'play'
    this.started_at = Date.now()
    debug('play', this._id)
    // sending game_start event
    this.emit('game_start', {game: {
      ...this
    }})
    await Promise.all([
      this.createQuestions(),
      DB.get('games').findOneAndUpdate(this._id, {
        $set: {
          started_at: this.started_at,
          status: 'play'
        }
      })
    ])
    // set timeout for emitting first question
    setTimeout(() => {
      this.sendQuestion()
    }, GAME_START_TIMEOUT)
  }

  async answer(user: ID, question: ID, answer: string) {
    const now = Date.now()
    const time = now - (this.question_timeout - GAME_ANSWER_TIMEOUT)
    const player = this.getPlayer(user)
    const realQuestion = this.questions[this.current_question]
    const check = player && // is player
      realQuestion._id === question && // is right question
      now < this.question_timeout // answered on time
    if (!check) return
    debug(JSON.stringify({user: player.username, question: realQuestion.question, answer, time}, null, '\t'))
    // modify the object
    player.answers.push({ question, answer, time })
    // update database
    await Promise.all([
      Game.pushAnswer(this._id, user, question, answer, time),
      realQuestion.answer(user, answer)
    ])
    if (this.haveAllAnswered(question))
      return this.endQuestionFlow()
  }

  /**
   * Called after all players have answered the question or
   * question timeout has been fired.
   */
  async endQuestionFlow() {
    if (this.isOver()) {
      return this.end()
    } else {
      this.current_question++
      await Game.incQuestion(this._id)
      this.sendQuestion()
    }
  }


  async questionTimeout(question: number) {
    await this.refresh()
    /**
     * if question index does not match it means
     * that all players have answered
     */
    if (this.current_question !== question)
      return
    else {
      return this.endQuestionFlow()
    }
  }

  /**
   */
  sendQuestion() {
    const question = this.questions[this.current_question]
    this.emit('question', {game: this._id, question})
    setTimeout(() => {
      this.questionTimeout(this.current_question)
      .catch(console.log)
    }, GAME_ANSWER_TIMEOUT)
  }


  async end() {
    debug('Game end')
    console.time('end')
    const stats = await this.getStats()
    debug('Stats')
    debug(JSON.stringify(stats, null, 3))
    // all end updates methods have 'atEndUpdate' at the beginning
    let ops = []
    for (let i in this.prototype) {
      if (i.indexOf('atEnd') >= 0) {
        ops.push(this.prototype[i](stats))
      }
    }
    debug('Ops',ops.length)
    await Promise.all(ops)
    this.emitToSide(0, 'game_end', stats)
    debug(stats.result)
    let other = {...stats}
    if (stats.result !== 0.5) {
      if (stats.result === 1)
        other.result = 0
      else other.result = 1
    }
    debug(other.result)
    this.emitToSide(1, 'game_end', other)
    console.timeEnd('end');
  }

  /**
   * Fetch game from DB and sets properties.
   */
  async refresh() {
    const g = await DB.get('games').findOne(this._id)
    Object.assign(this, g)
  }

  static async pushAnswer(
    game: ID,
    user: ID,
    question: ID,
    answer: string,
    time: number
    ) {
    return DB.get('games').findOneAndUpdate({
        _id: game,
        players: {
          $elemMatch: {
            _id: user
          }
        }
      },
      {
        $push: {
          'players.$.answers': {
            question: id(question),
            answer,
            time
          }
        }
      }
    )
  }

  /**
   * Increment current_question by 1
   */
  static async incQuestion(game: ID) {
    return DB.get('games').findOneAndUpdate(game, {
      $inc: {
        current_question: 1
      }
    })
  }

  /**
   * Cancel the game if it is not started
   */
  static async joinTimeout(game: ID) {
    const g = await DB.get('games').findOne(game)
    if (g.status === 'play') return
    debug('Cancel', this._id)
    // deleting room
    nsp.leaveRoom(this.playersIds(), this._id)
    // deleting game
    await DB.get('games').findOneAndDelete(game)
    // TODO put users in matchmaker again
  }


  /**
   *
   */
  static async cleanDocument(game: ID) {
    return DB.get('games').aggregate([
      {
        $match: { _id: game }
      },
      {
        $project: {
          'players.username': 0,
          'players.joined': 0,
          'current_question': 0,
          'status': 0
        }
      },
      {
        $addFields: {
          'questions': '$questions._id'
        }
      },
      {
        $out: "games"
      }
    ])
  }

  // UTILS

  haveAllAnswered(question: ID) : boolean {
    let b = true
    let i = 0
    while (i < this.players.length && b) {
      const p = this.players[i]
      if (!_.find(p.answers, {question}))
        b = false
    }
    return b
  }

  haveAllJoined() : boolean {
    for (let p of this.players) {
      if (!p.joined) return false
    }
    return true
  }

  emit(ev, ...message) {
    nsp.in(this._id).emit(ev,...message);
  }

  emitToSide(side, ev, ...message) {
    const users = _.filter(this.players, { side })
    .map(p => p._id)
    nsp.emitToUsers(users, ev, ...message)
  }

  emitToPlayer(id, ev, ...message) {
    nsp.emitToUser(id, ev, ...message)
  }

  connected() {
    return nsp.areConnected(this.playersIds())
  }

  playersIds() {
    return this.players.map(p => p._id)
  }

  getPlayer(_id) {
    return _.find(this.players, { _id })
  }

  isPlayer(_id) {
    return this.getPlayer(_id) ? true : false
  }

  isOver() {
    return false
  }

}
