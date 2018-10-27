// @flow

import { db } from '../utils/db';
import monk from 'monk';
import type { ID, GameType } from '../types'
import { game as namespace } from '../socket';
import { mm } from '../utils';
import { Rating } from '../utils'
import { Maps } from './cache';
import _ from 'lodash/core'
import crud from '../crud'
const debug = require('debug')('game:main')
const {
  MAX_QUESTIONS_RECORD,
  GAME_QUESTIONS,
  GAME_JOIN_TIMEOUT,
  GAME_START_TIMEOUT,
  GAME_ANSWER_TIMEOUT
} = require('../utils/constants')


export class Game {

  // creates players array and _id or copies argument if _id is present
  constructor({_id, side0, side1, type }) {
    // if _id is present the game was fetched from database
    if (_id) {
      let game = arguments[0]
      for (let i in game) {
        this[i] = game[i];
      }
      this.stringify();
      return;
    }
    // else a new game is created from the other params
    this._id = monk.id().toString();
    this.status = null;
    this.players = [];
    this.type = type;
    // next line assures that side0 is [0,length/2] and side1...
    for (let id of side0.concat(side1)) {
      this.players.push({
        _id: id,
        side: side0.indexOf(id) >= 0 ? 0 : 1,
        index: 0, // current question index
        answers: []
      })
    }
  }

  // return undefined if at least one player is not connected
  // else return this
  create() {
    // checks all players are connected, if not...
    // pushes all connected players back into the matchmaker
    let conns = this.connected();
    if (conns.length < this.players.length) {
      mm[this.type].push(conns);
      debug(this._id, 'Not all players are connected');
      return;
    }
    // keep the game in memory
    Maps.starting.set(this._id,this);
    this.status = 'create';
    // array of players who emitted 'join' message
    this.joined = [];
    // creating game room
    for (let p of this.players) {
      // player connection has been checked before
      // namespace.connections.has(p._id) &&
      namespace.connections.get(p._id).join(this._id);
    }
    // emitting new_game message
    this.emit('new_game', {_id: this._id, type: this.type});
    // game gets canceled if at least one player does not join
    this.joinTimeout = setTimeout(() => this.cancel(), GAME_JOIN_TIMEOUT);
    return this;
  }

  // starts game if all players joined
  join(user_id) {
    if (this.status !== 'create' || // wrong status
      !this.isPlayer(user_id) || // wrong player
      // player has joined yet
      this.joined.indexOf(user_id) >= 0) return
    else {
      let length = this.joined.push(user_id);
      // if all players have joined
      if (length === this.players.length) {
        // start game
        clearTimeout(this.joinTimeout);
        delete this.joined;
        delete this.joinTimeout;
        // delete game from RAM,
        // from now on all read and write is done in db
        Maps.starting.delete(this._id)
        this.start();
      }
    }
  }

  async createQuestions() {
    // query last questions from users
    let last_questions = await db.users.aggregate([
      {$match: {_id: {$in: Object.keys(this.players)}}},
      {$unwind: "$private.last_questions"},
      {$group: {
        _id: "$private.last_questions",
        users: {
          $addToSet: "$_id"
        }
      }}
    ])
    // query a sample of questions that don't match with users' last questions
    let questions = await db.questions.aggregate([
      {$match: {
        _id: {$nin: last_questions.map(q => q._id)}
      }},
      {$sample: {size: GAME_QUESTIONS}},
    ])
    this.questions = questions
    // couldn't quite do it with one aggregation pipeline
  }

  async fetchUsers(...fields) {
    return db.users.find({
      _id: {
        $in: this.players.map(p => p._id)
      }
    }, fields, {multi: true})
  }

  // look up users and teams infos
  async clientInfos(users) {
  }

  async insertInDb() {
    let obj = JSON.parse(JSON.stringify(this))
    obj._id = monk.id(obj._id)
    for (let i in obj.players) {
      let player = obj.players[i]
      player._id = monk.id(player._id)
    }
    obj.questions = obj.questions.map((q) => monk.id(q._id))
    return db.games.insert(obj)
  }

  copyFields(users, ...fields) {
    for (let i in users) {
      let player = this.getPlayer(users[i]._id)
      for (let f of fields) {
        player[f] = users[i][f]
      }
    }
  }

  async start() {
    this.status = 'play'
    debug('Start', this._id)
    Maps.q_timeouts.set(this._id, new Map())
    this.created_at = Date.now()
    let ops = await Promise.all([
      this.createQuestions(),
      this.fetchUsers('username','perf','picture')
    ])
    let users = ops[1]
    this.copyFields(users, 'perf', 'username', 'picture')
    // let's not inform the client about the questions' _ids
    // sending game_start event
    this.emit('game_start', {game: {
      ...this,
      questions: []
    }});
    // pushing into the db
    await this.insertInDb()
    this.stringify()
    // set timeout for emitting first question
    setTimeout(() => {
      for (let p of this.players) {
        this.sendQuestion(p._id)
      }
    }, GAME_START_TIMEOUT)
  }

  // if not all players have joined
  cancel() {
    if (this.status !== 'create') return
    debug('cancel', this._id);
    // sending cancel_game event
    // this.emit('cancel_game',this._id)
    // deleting room
    for (let p of this.players) {
      namespace.connections.has(p._id) &&
      namespace.connections.get(p._id).leave(this._id);
    }
    // putting joined users back in the matchmaker
    //mm[this.type].push(this.joined)
    // delete game
    Maps.starting.delete(this._id)
  }

  emit(ev, ...message) {
    namespace.in(this._id).emit(ev,...message);
  }

  emitToSide(side, ev, ...message) {
    for (let player of this.players) {
      player.side === side && namespace.connections.get(player._id).emit(ev,...message);
    }
  }

  emitToPlayer(id, ev, ...message) {
    namespace.connections.has(id) &&
    namespace.connections.get(id).emit(ev, ...message)
  }

  async answer({user, question, answer}) {
    let player = this.getPlayer(user)
    if (!player) return Promise.reject("Wrong player")
    let questions = this.questions
    // if the user has no more questions
    if (player.index === questions.length) return Promise.reject("No more questions");
    let realQuestion = questions[player.index]
    // wrong question
    if (question !== realQuestion._id) {
      return Promise.reject("Wrong question")
    }
    debug(JSON.stringify(arguments[0]))
    // clears question timeout
    clearTimeout(Maps.q_timeouts.get(this._id).get(user))
    // modify the object
    player.index++
    player.answers.push({question, answer})
    // update database
    await crud.game.setAnswer({game: this._id, user, question, answer})
  }

  sendQuestion(user) {
    let player = this.getPlayer(user);
    // don't send if player has answered all questions
    if (player.index >= this.questions.length) return
    // else
    let _id = player._id;
    let question = this.questions[player.index];
    this.emitToPlayer(_id, 'question', {game: this._id, question});
    // sets question timeout
    Maps.q_timeouts.get(this._id).set(_id,
      setTimeout(() => {
        this.answer({user: _id, question: question._id, answer: null})
      }, GAME_ANSWER_TIMEOUT))
  }

  connected() {
    let arr = [];
    for (let p of this.players) {
      if (namespace.connections.has(p._id)) {
        arr.push(p._id)
      }
    }
    return arr;
  }

  getPlayer(_id) {
    return _.find(this.players, {_id})
  }

  isPlayer(_id) {
    return _.find(this.players, {_id}) !== undefined
  }

  isOver() {
    let questions = this.questions.length;
    let players = this.players;
    let sum = 0;
    let max = questions * players.length;
    for (let p of players) {
      sum += p.index
    }
    return sum === max
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
    let users = await db.users.find({
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
    Maps.q_timeouts.delete(this._id)
    const stats = await this.getStats()
    debug('Stats')
    debug(JSON.stringify(stats, null, 3));
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
            $each: this.questions.map(q => monk.id(q._id)),
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
      return db.users.findOneAndUpdate(query,update)
    })
    return Promise.all(ops)
  }

  async atEndUpdateGame(stats) {
    return db.games.findOneAndUpdate(this._id,{
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
      return db.questions.findOneAndUpdate(q._id,
        // increment hit and miss
        {$inc: {hit: q.hit,miss: q.miss}})
    })
    return Promise.all(ops)
  }

  // turns every ObjectID to String
  stringify() {
    let g = JSON.parse(JSON.stringify(this))
    for (let i in g) {
      this[i] = g[i];
    }
  }

}

/**
 * Creates a game.
 *
 * @param {Object} game
 * @param {string[]} game.side0 Users' _ids of first team
 * @param {string[]} game.side1 Second team
 * @param {string[]} game.teams _ids of teams (if it is a team game)
 * @param {string} game.type Game type
 * @return {Game} Game initialized with the right class
 */
Game.create = (side0 : ID[], side1: ID[], type: GameType, teams: ID[]) => {
  debug('creation', arguments)
  // TODO
  return new classes[type](arguments[0]).create()
}

// fetch game and initialize it with right class
async function fetch(_id) {
  let game = await crud.Game.fetchWithQuestions({game: _id})
  if (!game) return Promise.reject("Game does not exist!")
  return new classes[game.type](game)
}
