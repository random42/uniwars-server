import { DB } from '../db'
const debug = require('debug')('http:user')
import fs from 'fs'
import socket from '../socket'
import monk from 'monk'
import {
  PAGE_RESULTS
} from '../constants'
import { User, Model } from '../models'


export class UserCtrl {

  static convertNewsToNotification(news) {

  }

  static async sendNews(news, users) {
    const tokens = await DB.get('users').aggregate([
      {
        $match: {
          _id: {
            $in: users
          },
          'private.expo_push_token': {
            $exists: true
          }
        }
      },
      {
        $replaceRoot: { newRoot: '$private.expo_push_token'}
      }
    ])
    let message = UserCtrl.convertNewsToNotification(news)

  }

  /**
   * Sends a socket message with the news.
   *
   * @param  {ID} user User that received the news
   * @param  {Object} news News object
   */
  static async handleNewsCreation(user, news) {
    socket.main.emitToUser(user, 'news', news)
  }

  /**
   * Handle consequence of response to the news
   *
   * @param  {ID} user User affected by news
   * @param  {type} news  News object
   * @param  {type} response
   */
  static async handleNewsResponse(user, news, response) {
    if (response !== 'y')
      return
    switch (news.type) {
      case "challenge": {
        break
      }
      case "friend_request": {
        await User.createFriendship(user, news.user)
        break
      }
    }
  }

  static async getUser(req, res, next) {
    const { _id, project } = req.query
    const docs = await User.fetch({ _id }, project)
    if (docs.length === 0)
      res.sendStatus(404)
    let doc = docs[0]
    res.json(doc)
  }

  static async search(req, res, next) {
    let { text, page } = req.query
    if (isNaN(page))
      return res.sendStatus(400)
    const docs = await User.search(text, page * PAGE_RESULTS, PAGE_RESULTS)
    res.json(docs)
  }

  static async deleteUser(req, res, next) {
    const { username } = req.body
    const {user} = req
    const doc = await DB.get('users').findOne({
      _id: user,
      username
    })
    if (doc)
    // TODO
      res.sendStatus(200)
    else {
      res.sendStatus(400)
    }
  }

  static async top(req, res, next) {
    const { sort, page } = req.query
    const docs = await User.top(page * PAGE_RESULTS, PAGE_RESULTS, sort, 'SMALL')
    res.json(docs)
  }

  static async getPicture(req, res, next) {
    res.sendStatus(200)
  }

  static async updatePicture(req, res, next) {
    res.sendStatus(200)
  }

  static async addFriend(req, res, next) {
    const { who } = req.body
    const [ friends, blocked ] = await Promise.all([
      User.areFriends(req.user, who),
      User.isBlocked(who, req.user, { friendship: true })
    ])
    if (friends || blocked) {
      res.sendStatus(400)
    }
    else {
      const news = await User.friendRequest(req.user, who)
      await UserCtrl.handleNewsCreation(who, news)
      res.sendStatus(200)
    }
  }

  static async respondNews(req, res, next) {
    const { news, response } = req.body
    // retrieving news object
    const obj = await Model.pullNews(req.user, news, response, User)
    await UserCtrl.handleNewsResponse(req.user, obj, response)
    res.sendStatus(200)
  }

  static async removeFriend(req, res, next) {
    const { who } = req.body
    await User.removeFriendship(req.user, who)
    res.sendStatus(200)
  }

  static async blockUser(req, res, next) {
    const { who, scopes } = req.body
    await User.block(req.user, who, scopes)
    res.sendStatus(200)
  }

  static async unblockUser(req, res, next) {
    const { who } = req.body
    await User.unblock(req.user, who)
    res.sendStatus(200)
  }

  static async challengeUser(req, res, next) {
    const { who } = req.body
    const blocked = await User.isBlocked(who, req.user, { challenge : true })
    if (blocked) {
      return res.sendStatus(400)
    }
    else {
      const news = await User.challenge(req.user, who)
      await handleNewsCreation(who, news)
      res.sendStatus(200)
    }
  }

}

export default module.exports
