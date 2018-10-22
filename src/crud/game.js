const debug = require('debug')('crud:game')
const db = require('../utils/db')
const _ = require('lodash/core')
const monk = require('monk')
const { PROJECTIONS } = require('../../api/api')
const utils = require('../utils')
const NO_PROJ = {projection: {_id: 1}}

class Game {

  /**
   * async fetchWithQuestions - description
   *
   * @param  {Object} {game} description
   * @return {Object} Game with questions objects
   */
  static async fetchWithQuestions({game}) {
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
    let doc = await db.games.aggregate(pipeline)
    if (doc.length !== 1)
      return Promise.reject("No game found.")
    doc = doc[0]
    // to have the same questions order
    let questions = []
    for (let _id of doc.questions) {
      let q = _.find(doc.questions_docs, {_id})
      questions.push(q)
    }
    doc.questions = questions
    delete doc.questions_docs
    return new Game(doc)
  }

  static async getQuestions({game}) {
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
    let doc = await db.games.aggregate(pipeline)
    if (doc.length !== 1) return
    return doc[0].questions
  }

  static async getQuestion({game, index}) {
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
    let doc = await db.games.aggregate(pipeline)
    if (doc.length !== 1) return
    doc = doc[0]
    if (index >= doc.questions.length) return
    return doc.questions[index]
  }

  /**
    game with users' usernames and picture,
    as well as teams' names, rating and picture
  */
  static async joinUsersAndTeams({game}) {
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
    let doc = await db.games.aggregate(pipeline)
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
  static async setAnswer({game, user, question, answer}) {
    return db.games.findOneAndUpdate({
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
  static async endGame({game}) {
    let fetch = await Promise.all([
      db.games.findOne(game),
      this.getQuestions({game})
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
    return db.games.findOneAndUpdate(game._id, game)
  }
}

exports = Game
