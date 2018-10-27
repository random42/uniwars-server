import express from 'express'
export const router = express.Router()
import { db } from '../utils/db'
import monk from 'monk'
import { MAJORS } from '../../assets/majors.json'
const debug = require('debug')('http:uni')
// see https://github.com/kelektiv/node.bcrypt.js


router.get('/', async function(req,res,next) {
  let { _id, project } = req.query
  if (!_id)
    return res.sendStatus(400)
  let doc = await crud.uni.getFull({uni: _id})
  res.json(doc)
})

router.get('/top', async function(req,res,next) {
  let { from, to } = req.query
  if (isNaN(from) || isNaN(to))
    return res.sendStatus(400)
  from = parseInt(from)
  to = parseInt(to)
  let docs = await crud.team.top(req.query)
  res.json(docs)
})


// TODO
router.get('/rank', async function(req,res,next) {
})



