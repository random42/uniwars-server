import { DB } from '../db'
const debug = require('debug')('http:user')
import fs from 'fs'
import socket from '../socket'
import monk from 'monk'
import {
  PAGE_RESULTS
} from '../constants'
import { User } from '../models'


/**
 * Sends a socket message with the news.
 *
 * @param  {ID} user User that receives the news
 * @param  {Object} news News object
 */
export async function handleNewsCreation(user, news) {
  socket.main.emitToUser(user, 'news', news)
}


/**
 * Handle consequence of response to the news
 *
 * @param  {ID} user User affected by news
 * @param  {type} news  News object
 * @param  {type} response
 */
export async function handleNewsResponse(user, news, response) {
  if (response === 'n')
    return
  // response === 'y'
  switch (news.type) {
    case "solo_challenge": {
      break
    }
    case "friend_request": {
      await User.createFriendship(user, news.user)
      break
    }
  }
}

export async function getUser(req, res, next) {
  const { _id, project } = req.query
  const docs = User.fetch({ _id }, project)
  if (docs.length !== 1)
    res.sendStatus(400)
  let doc = docs[0]
  doc.online = socket.isOnline(_id)
  res.json(doc)
}

export async function search(req, res, next) {
  let { text, page } = req.query
  if (isNaN(page))
    return res.sendStatus(400)
  const docs = await User.search(text, page * PAGE_RESULTS, PAGE_RESULTS)
  res.json(docs)
}

export async function deleteUser(req, res, next) {
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

export async function top(req, res, next) {
  const { sort, page } = req.query
  const docs = await User.top(page * PAGE_RESULTS, PAGE_RESULTS, sort, 'SMALL')
  res.json(docs)
}

export async function getPicture(req, res, next) {
  res.sendStatus(200)
}

export async function updatePicture(req, res, next) {
  res.sendStatus(200)
}

export async function addFriend(req, res, next) {
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
    await handleNewsCreation(who, news)
    res.sendStatus(200)
  }
}

export async function respondNews(req, res, next) {
  const { news, response } = req.body
  // retrieving news object
  const obj = await User.pullNews(req.user, news, response)
  await handleNewsResponse(req.user, obj, response)
  res.sendStatus(200)
}

export async function removeFriend(req, res, next) {
  const { who } = req.body
  await User.removeFriendship(req.user, who)
  res.sendStatus(200)
}

export async function blockUser(req, res, next) {
  const { who, scopes } = req.body
  await User.block(req.user, who, scopes)
  res.sendStatus(200)
}

export async function unblockUser(req, res, next) {
  const { who } = req.body
  await User.unblock(req.user, who)
  res.sendStatus(200)
}

export async function challengeUser(req, res, next) {
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

export default module.exports
