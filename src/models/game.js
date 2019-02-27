// @flow

import { DB } from '../db';
import _ from 'lodash/core';
import { id } from 'monk';
import type { ID, GameType, Perf, GameResult, GameStatus } from '../types'

const GAMES = DB.get('games');

export default class GameCrud {

  static async fetch(game: ID) {
    return GAMES.findOne(game);
  }

  static async delete(game: ID) {
    return GAMES.findOneAndDelete(game);
  }

  static async moveAndDelete(game: ID, result: GameResult) {
    // move game
    await GAMES.aggregate([
      {
        $match: { _id: game }
      },
      {
        $project: {
          'players.username': 0,
          'players.joined': 0,
          'current_question': 0,
          'question_timeout': 0,
          'status': 0
        }
      },
      {
        $addFields: {
          'questions': '$questions._id',
          result
        }
      },
      {
        $out: "ended_games"
      }
    ])
    return GAMES.findOneAndDelete(game);
  }

  static async pushAnswer(
    game: ID,
    user: ID,
    question: ID,
    answer: number,
    time: number
  ) {
    return GAMES.findOneAndUpdate({
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
    return GAMES.findOneAndUpdate(game, {
      $inc: {
        current_question: 1
      }
    })
  }


  /**
   * @return true if all players have joined
   */
  static async join(game: ID, user: ID): Promise<Boolean> {
    const doc = GAMES.findOneAndUpdate(
      {
        _id: game,
        players: {
          $elemMatch: {
            _id: user
          }
        }
      },
      {
        $set: {
          'players.$.joined': true
        }
      },
      'players.joined'
    )
    return _.every(doc.players, (p) => p.joined);
  }
}
