// @flow

import type { ID, GameType } from '../types'
import { DB } from '../db';
import { id } from 'monk';
import { Model, Question, User, Team } from '../models'
import type { ID, GameType, Perf, GameResult, GameStatus } from '../types'
import { game as nsp } from '../socket';
import { mm } from '../utils';
import Utils, { Rating } from '../utils'
import { Cache } from './cache';
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

  joined : ID[] // players who joined
  joinTimeout: any


  /**
   * Start game by checking players' connection and sending 'new_game'
   * event. Sets joinTimeout in case not all clients respond with 'join' event
   * Object is saved in Cache.starting
   */
  start() : Game {
    // checks all players are connected, if not...
    // pushes all connected players back into the matchmaker
    let conns = this.connected()
    if (conns.length < this.players.length) {
      debug(this._id, 'Not all players are connected')
      return
    }
    // keep the game in memory
    Cache.starting.set(this._id, this)
    this.status = 'create'
    // array of players who emitted 'join' message
    this.joined = []
    // creating game room
    nsp.joinRoom(this.playersIds(), this._id)
    // emitting new_game message
    this.emit('new_game', {_id: this._id, type: this.type});
    // game gets canceled if at least one player does not join
    this.joinTimeout = setTimeout(() => this.cancel(), GAME_JOIN_TIMEOUT);
    return this
  }


  /**
   * Called when player sends 'join' message. Returns true if joins successfully.
   */
  join(user : ID) : boolean {
    if (this.status !== 'create' || // wrong status
      !this.isPlayer(user) || // wrong player
      // player has joined yet
      this.joined.indexOf(user) >= 0) return false
    let length = this.joined.push(user);
    // if all players have joined
    if (length === this.players.length) {
      // start game
      clearTimeout(this.joinTimeout);
      delete this.joined;
      delete this.joinTimeout;
      // delete game from RAM,
      // from now on all read and write is done in DB
      Cache.starting.delete(this._id)
      this.play()
    }
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
        questions: questions
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
    debug('Start', this._id)
    this.created_at = Date.now()
    // sending game_start event
    this.emit('game_start', {game: {
      ...this
    }})
    await this.createQuestions()
    // set timeout for emitting first question
    setTimeout(() => {
      this.sendQuestion()
    }, GAME_START_TIMEOUT)
  }


  /**
   * Called on joinTimeout, when not all players have joined the game
   */
  cancel() {
    if (this.status !== 'create') return
    debug('cancel', this._id)
    // sending cancel_game event
    // this.emit('cancel_game',this._id)
    // deleting room
    nsp.leaveRoom(this.playersIds(), this._id)
    // putting joined users back in the matchmaker
    //mm[this.type].push(this.joined)
    // delete game
    Cache.starting.delete(this._id)
  }

  async answer(user: ID, question: ID, answer: string) {
    const player = this.getPlayer(user)
    if (!player) return
    const questions = this.questions
    // if the user has no more questions
    if (player.answers.length === questions.length) return
    const realQuestion = questions[this.current_question]
    // wrong question
    if (!realQuestion._id === question)
      return
    debug(JSON.stringify({user, question, answer}, null, '\t'))
    // modify the object
    player.answers.push({question, answer})
    // update database
    await Game.pushAnswer(this._id, player._id, question, answer)
    if (this.haveAllAnswered()) {
      const timeout = Cache.timeouts.get(this._id)
      clearTimeout(timeout)
    }
  }

  /**
   * sendQuestion - description
   *
   * @return {type}  description
   */
  sendQuestion() {
    const question = this.questions[this.current_question];
    this.emit('question', {game: this._id, question});
    // sets question timeout
    Cache.timeouts.set(
      this._id,
      setTimeout(() => {
        this.answer({user: _id, question: question._id, answer: null})
      }, GAME_ANSWER_TIMEOUT)
    )
  }

  /*
  {
    players: [{
      _id: '',
      points: 1,
      stats: [{
        category: "Engineering",
        hit: 1,
        miss: 1
      }]
    }],
    questions: [{
      _id: '',
      hit: 1,
      miss: 10
    }],
    result: 1
  }
  */
  async getStats() {
    let users = await DB.get('users').find({
      _id: {
        $in: this.players.map(p => p._id)
      }
    },['stats'])
    let half_length = this.players.length / 2
    let stats = {},
    side0_points = 0,
    side1_points = 0
    // getting sides' points, adding user
    stats.players = this.players.map((p) => {
      let u = _.find(users, {_id: p._id})
      let points = p.answers.filter((ans) => {
        let question = _.find(this.questions, {_id: ans.question})
        return ans.answer === question.correct_answer
      }).length
      let side = p.side
      if (side === 0) {
        side0_points += points
      } else {
        side1_points += points
      }
      return {
        _id: p._id,
        side,
        points,
        stats: u.stats || []
      }
    });
    stats.questions = this.questions.map((q) => {
      return {
        _id: q._id,
        hit: 0,
        miss: 0
      }
    })
    // calculating hit miss for each player's category and each question
    for (let q in this.questions) {
      let question = this.questions[q]
      let q_stats = stats.questions[q]
      for (let p in this.players) {
        let player = this.players[p]
        let p_stats = stats.players[p]
        let category = _.find(p_stats.stats, {'category': question.category})
        if (!category) {
          category = {category: question.category, hit: 0, miss: 0}
          p_stats.stats.push(category)
        }
        if (_.find(player.answers, {question: question._id}).answer === question.correct_answer) {
          category.hit++
          q_stats.hit++
        } else {
          category.miss++
          q_stats.miss++
        }
      }
    }
    // result
    if (side0_points === side1_points) {
      stats.result = 0.5
    } else if (side0_points > side1_points) {
      stats.result = 1
    } else {
      stats.result = 0
    }
    this.result = stats.result;
    return stats;
  }

  async end() {
    debug('Game end')
    console.time('end')
    // delete q_timeouts reference
    Cache.timeouts.delete(this._id)
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

  async atEndUpdateUsers(stats) {
    let ops = stats.players.map(p => {
      let resultField
      if (stats.result === 0.5)
        resultField = 'draws'
      else if ((stats.result === 1 && !p.side) || (stats.result === 0 && p.side))
        resultField = 'wins'
      else
        resultField = 'losses'
      let query = {
        _id: p._id,
      }
      let update = {
        $push: {
          // pushing questions to last_questions
          // no need of $addToSet as questions cannot match
          'private.last_questions': {
            $each: this.questions.map(q => id(q._id)),
            // maintains a limited number of questions' records
            $slice: -MAX_QUESTIONS_RECORD
          },

        },
        $set: {
          // add hit miss stats
          stats: p.stats,
        },
        // add win/loss/draw to games[type]
        $inc: {
          ['games.' + this.type + '.' + resultField]: 1,
        },
      };
      return DB.get('users').findOneAndUpdate(query,update)
    })
    return Promise.all(ops)
  }

  async atEndUpdateGame(stats) {
    return DB.get('games').findOneAndUpdate(this._id,{
      $set: {
        result: stats.result,
        status: 'ended',
        ended_at: Date.now()
      },
      // not possible in MongoDB 3.4
      $unset: {
        'players.$[].index': ""
      }
    })
  }

  async atEndUpdateQuestions(stats) {
    let ops = stats.questions.map(q => {
      return DB.get('questions').findOneAndUpdate(q._id,
        // increment hit and miss
        {$inc: {hit: q.hit,miss: q.miss}})
    })
    return Promise.all(ops)
  }

  haveAllAnswered() : boolean {
    let b = true
    let i = 0
    const index = this.current_question
    while (i < this.players.length && b) {
      const p = this.players[i]
      if (p.answers.length !== index + 1)
        b = false
    }
    return b
  }

  // turns every ObjectID to String
  stringify() {
    let g = JSON.parse(JSON.stringify(this))
    for (let i in g) {
      this[i] = g[i];
    }
  }

  hasJoined(user : ID) : boolean {
    return _.find(this.joined, user) ? true : false
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
    const questions = this.questions.length
    const players = this.players
    let sum = 0;
    const max = questions * players.length
    for (let p of players) {
      sum += p.answers.length
    }
    return sum === max
  }

  static questionTimeout(game: ID) {

  }

  static sendQuestion()

  static async pushAnswer(game: ID, user: ID, question: ID, answer: string) {
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
            answer
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
}
