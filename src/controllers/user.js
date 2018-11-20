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
  page = parseInt(page)
  const docs = await User.search(text, page * PAGE_RESULTS, PAGE_RESULTS)
  res.json(docs)
}

export async function deleteUser(req, res, next) {
  res.sendStatus(200)
}

export async function top(req, res, next) {
res.sendStatus(200)
}

export async function getPicture(req, res, next) {
res.sendStatus(200)
}

export async function updatePicture(req, res, next) {
res.sendStatus(200)
}

export async function addFriend(req, res, next) {
res.sendStatus(200)
}

export async function respondNews(req, res, next) {
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