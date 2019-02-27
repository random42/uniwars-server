// @flow

import { id } from 'monk';
import { Model, Question, User, Team, Game as DB } from '../models'
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


export class Game {

  /**
   * Start game by checking players' connection and sending 'new_game'
   * event.
   */
  async start() : Game {
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
    this.emit('new_game', {_id: this._id, type: this.type})
    setTimeout(() => {
      Game.joinTimeout(this._id)
      .catch(console.log)
    })
    return this
  }

  /**
   * Called when player sends 'join' message. Returns true on success
   */
  async join(user : ID, response: 'y' | 'n') : boolean {
    let player = this.getPlayer(user)
    const check =
      this.status === 'create' &&
      player
    if (!check) return false
    if (response === 'n') {
      return this.delete()
    }
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
      await this.play()
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
    const realQuestion : Question = this.questions[this.current_question]
    const check = player && // is player
      realQuestion._id === question && // is right question
      now < this.question_timeout // answered on time
    if (!check) return
    debug(JSON.stringify({user: player.username, question: realQuestion.question, answer, time}, null, 2))
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
    if (this.current_question === question)
      return this.endQuestionFlow()
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


  /**
   * Gives some statistics on players.
   */
  stats() : Array<{
      _id: ID,
      side: number,
      points: number,
      avg_answer_time: number
    }> {
    return this.players.map(p => {
      let s = _.pick(p, ['_id','side'])
      s.points = 0
      let timeSum = 0
      for (let a of p.answers) {
        timeSum += a.time
        const q = _.find(this.questions, {_id: a.question})
        if (q.isRight(a.answer)) s.points++
      }
      s.avg_answer_time = timeSum / p.answers.length
    })
  }


  /**
   * 1 if side 0 wins,
   * 0 if side 1 wins,
   * 0.5 draw
   */
  result(stats : Object[]) : number {
    let p0 = 0, p1 = 0
    for (let s of stats) {
      if (s.side)
        p1 += s.points
      else
        p0 += s.points
    }
    if (p0 > p1)
      return 1
    else if (p1 > p0)
      return 0
    else return 0.5
  }

  /**
   * Set game result, stats, propagate result in user.games.
   *
   * Send result to the clients
   */
  async end() {
    debug('End', this._id)
    console.time('end')
    // saving on this to reuse stats in other functions
    const stats = this.stats()
    const result = this.result(stats)
    this.stats = stats
    this.result = result
    debug(JSON.stringify(stats, null, 2))
    await Promise.all(this.updatesAtEnd())
    const clientData = {
      game: this._id,
      result,
      stats
    }
    this.emitToSide(0, 'game_end', clientData)
    this.emitToSide(1, 'game_end', {
      ...clientData,
      result: Game.convertResult(this.result, 1)
    })
    nsp.leaveRoom(this.playersIds(), this._id)
    console.timeEnd('end')
  }


  /**
   * Called at end after calculating stats and result. Returns a Promise of all
   * DB updates to do after game end. Rewrite this function and call
   * super to add new updates to after end.
   *
   * Set result and clean game document,
   *
   * Add win/loss/draw to users' 'games' field.
   */
  updatesAtEnd() : Promise {
    return Promise.all([
      Game.setResultAndClean(this._id, this.result),
      this.addResultToUsers()
    ])
  }

  async addResultToUsers() {
    const updateSide = (side) => {
      const players = this.side(side)
      const ids = players.map(p => p._id)
      const result = Game.convertResult(this.result, side)
      let field
      if (result === 1)
        field = 'wins'
      else if (result === 0)
        field = 'losses'
      else field = 'draws'
      return DB.get('users').update({
        _id: {
          $in: ids
        }
      }, {
        $inc: {
          ['games.' + this.type + '.' + field]: 1
        }
      }, { multi: true })
    }
    return Promise.all([
      updateSide(0),
      updateSide(1)
    ])
  }

  /**
   * Fetch game from DB and sets properties.
   */
  async refresh() {
    const g = await DB.get('games').findOne(this._id)
    Object.assign(this, g)
  }

  async delete() {
    nsp.leaveRoom(this.playersIds(), this._id)
    await Game.delete(this._id)
  }

  // UTILS

  static convertResult(result: number, side: number) {
    if (result === 0.5 || side === 0)
      return result
    else {
      return Math.abs(result - 1)
    }
  }


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

  emit(ev: string, ...message: Array) {
    nsp.in(this._id).emit(ev,...message);
  }

  emitToSide(side: number, ev: string, ...message: Array) {
    const users = this.side(side)
    .map(p => p._id)
    nsp.emitToUsers(users, ev, ...message)
  }

  emitToPlayer(id: number, ev: string, ...message: Array) {
    nsp.emitToUser(id, ev, ...message)
  }

  connected() {
    return nsp.areConnected(this.playersIds())
  }

  playersIds() {
    return this.players.map(p => p._id)
  }

  getPlayer(_id: ID) {
    return _.find(this.players, { _id })
  }

  isPlayer(_id: ID) {
    return this.getPlayer(_id) ? true : false
  }

  isOver() {
    return this.current_question === this.questions.length
  }


  /**
   * Filters players by side
   */
  side(side: number) {
    return _.filter(this.players, { side })
  }

}
