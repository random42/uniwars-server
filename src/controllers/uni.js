import { DB } from '../db'
const debug = require('debug')('http:uni')
import fs from 'fs'
import socket from '../socket'
import monk from 'monk'
import {
  PAGE_RESULTS
} from '../constants'
import { User, Model, Uni } from '../models'


export class UniCtrl {
  static async getUni(req, res, next) {
    const { _id, project } = req.query
    const docs = await Uni.fetch({ _id }, project)
    if (docs.length === 0)
      res.sendStatus(404)
    let doc = docs[0]
    res.json(doc)
  }

  static async top(req, res, next) {
    const { sort, page } = req.query
    const docs = await User.top(page * PAGE_RESULTS, PAGE_RESULTS)
    res.json(docs)
  }

}
