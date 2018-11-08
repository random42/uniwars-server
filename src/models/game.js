
const debug = require('debug')('models:game')
import { DB } from '../db'
import { _ } from 'lodash/core'
import monk from 'monk'
import type { ID, GameType } from '../types'
const { PROJECTIONS } = require('../../api/api')
import { utils } from '../utils'
const NO_PROJ = {projection: {_id: 1}}

export class Game {

  /**
   *
   *
   */
  static async fetchWithQuestions(game : ID) : Promise<Game> {
    const pipeline = [
      {
        $match: {_id: monk.id(game)}
      },
      {
        $lookup: {
          from: 'questions',
          localField: 'questions',
          foreignField: '_id',
          as: 'questions_docs'
        }
      }
    ]
    let doc = await DB.get('games').aggregate(pipeline)
    if (doc.length !== 1)
      return Promise.reject("No game found.")
    doc = doc[0]
    // $lookup does not maintain the order
    let questions = []
    for (let _id of doc.questions) {
      let q = _.find(doc.questions_docs, {_id})
      questions.push(q)
    }
    doc.questions = questions
    delete doc.questions_docs
    return new Game(doc)
  }

  static async getQuestions(game : string) : Array<Question> {
    const pipeline = [
      {
        $match: {_id: monk.id(game)}
      },
      {
        $lookup: {
          from: 'questions',
          localField: 'questions',
          foreignField: '_id',
          as: 'questions'
        }
      },
      {
        $project: {
          questions: 1
        }
      }
    ]
    let doc = await DB.get('games').aggregate(pipeline)
    if (doc.length !== 1)
    return doc[0].questions
  }

  static async getQuestion(game : string, index : number) {
    const pipeline = [
      {
        $match: { _id: monk.id(game) }
      },
      {
        $lookup: {
          from: 'questions',
          localField: 'questions',
          foreignField: '_id',
          as: 'questions'
        }
      }
    ]
    let doc = await DB.get('games').aggregate(pipeline)
    if (doc.length !== 1) return
    doc = doc[0]
    if (index >= doc.questions.length) return
    return doc.questions[index]
  }

  /**
    game with users' usernames and picture,
    as well as teams' names, rating and picture
  */
  static async joinUsersAndTeams(game : string) {
    const pipeline = [
      {
        $match: { _id: monk.id(game) }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'players._id',
          foreignField: '_id',
          as: 'users_docs'
        }
      },
      {
        $lookup: {
          from: 'teams',
          localField: 'teams',
          foreignField: '_id',
          as: 'teams'
        }
      }
    ]
    let doc = await DB.get('games').aggregate(pipeline)
    if (doc.length !== 1) return undefined
    doc = doc[0]
    _.forEach(doc.users_docs, (item, index, arr) => {
      let user = doc.users[index]
      user.picture = item.picture
      user.username = item.username
      delete user.index
      delete user.answers
    })
    delete doc.users_docs
    if (doc.teams) {
      doc.teams = doc.teams.map((item) => {
        return {
          name: item.name,
          rating: item.perf.rating,
          picture: item.picture
        }
      })
    }
    return doc
  }

  /**
    pushes the answer and update the question index of the player
  */
  static async setAnswer(game : string, user : string, question : string, answer : string) {
    return DB.get('games').findOneAndUpdate({
      _id: game,
      // to specify the user to update
      players:  { $elemMatch: {_id: monk.id(user)} }
    },{
      $push: {
        'players.$.answers': {
          question: monk.id(question),
          answer
        }
      },
      $inc: {
        'players.$.index': 1
      }
    }, {
      ...NO_PROJ
    })
  }

  /**
    counts points of each side and sets the result consequently
    sets 'ended_at' and 'status' fields
    removes 'index' field from players
    returns updated game
  */
  static async endGame(game : string) {
    let fetch = await Promise.all([
      DB.get('games').findOne(game),
      Game.getQuestions(game)
    ])
    game = fetch[0]
    let questions = fetch[1]
    game.ended_at = Date.now()
    game.status = 'end'
    let side0 = 0, side1 = 0
    for (let p of game.players) {
      delete p.index
      for (let ans of p.answers) {
        let q = _.find(questions, {_id: ans.question})
        if (q.correct_answer === ans.answer) {
          p.side === 0 ? side0++ : side1++
        }
      }
    }
    if (side0 > side1) game.result = 1
    else if (side0 === side1) game.result = 0.5
    else game.result = 0
    return DB.get('games').findOneAndUpdate(game._id, game)
  }
}
