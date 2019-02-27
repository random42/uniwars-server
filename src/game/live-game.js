// @flow

import type { ID } from '../types'


/**
 *
 */
export class LiveGame {

  /**
   * Creates a new game that will start on given time.
   */
  static async setGame(time: Date) : Promise<LiveGame> {

  }

  /**
   * Subscribes the user to the game, if game is not started and
   */
  static async join(user: ID, game: ID) : Promise<boolean> {

  }

  static async leave(user: ID, game: ID) {}

}
