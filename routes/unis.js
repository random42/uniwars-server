const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const sharp = require('sharp');
const monk = require('monk');
const Rank = require('../utils/rank');
const MAJORS = require('../../data/majors.json');
// see https://github.com/kelektiv/node.bcrypt.js
const saltRounds = 12;
const rankSort = {
  users: -1
}


router.get('/', async function(req,res,next) {
  try {
    let query = req.query;
    let doc = await db.unis.findOne(query);
    if (doc) res.json(doc);
    else res.status(400).send('uni not found');

  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.get('/top', async function(req,res,next) {
  try {
    let query = req.query;
    let from = parseInt(query.from);
    let to = parseInt(query.to);
    let sortField = 'rating.' + req.query.field;
    let sort = {};
    sort[sortField] = -1;
    sort = {...sort,...rankSort};
    let projection = {
      name: 1,
      rating: 1,
      alpha_two_code: 1,
      users: 1,
    }
    let docs = await Rank.top(db.unis,from,to,sort,projection);
    res.json(docs);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.get('/rank', async function(req,res,next) {
  try {
    let name = req.query.name;
    let field = req.query.field;
    let queryField = 'rating.'+field;
    let sort = {};
    sort[queryField] = -1;
    sort = {...sort,...rankSort};
    let query = {name};
    let ranking = await Rank.rank(db.unis,query,sort);
    if (!ranking) {
      res.sendStatus(400);
      return
    }
    res.json(ranking);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})


module.exports = router;
