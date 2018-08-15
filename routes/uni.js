const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const bcrypt = require('bcrypt')
const sharp = require('sharp')
const monk = require('monk')
const MAJORS = require('../assets/majors.json')
// see https://github.com/kelektiv/node.bcrypt.js
const saltRounds = 12


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


module.exports = router;
