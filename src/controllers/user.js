import { DB } from '../db'
const debug = require('debug')('http:user')
import fs from 'fs'
import socket from '../socket'
import monk from 'monk'
import {
  PAGE_RESULTS
} from '../constants'
import { User } from '../models'


export async function getUser(req, res, next) {
  const { _id, project } = req.query
  const docs = User.fetch({ _id }, project)
  if (docs.length !== 1)
    res.sendStatus(400)
  let doc = docs[0]
  doc.online = socket.isUserOnline(_id)
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
  const friends = await User.areFriends(req.user, who)
  if (!friends) {
    await User.friendRequest(req.user, who)
    res.sendStatus(200)
  }
  else {
    res.sendStatus(400)
  }
}

export async function respondNews(req, res, next) {
  const { news, response } = req.body
  await User.respondNews(req.user, news, response)
  res.sendStatus(200)
}

export async function removeFriend(req, res, next) {
res.sendStatus(200)
}

export async function blockUser(req, res, next) {
res.sendStatus(200)
}

export async function unblockUser(req, res, next) {
res.sendStatus(200)
}

export async function challengeUser(req, res, next) {

}
