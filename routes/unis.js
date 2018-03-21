const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const teams = db.get("teams");
const users = db.get("users");
const unis = db.get("unis");
const sharp = require('sharp');
const monk = require('monk');
const majors = require('../data/majors.json');
// see https://github.com/kelektiv/node.bcrypt.js
const saltRounds = 12;

const MAX_RESULTS = 20;


router.get('/', async function(req,res,next) {
  try {
    let query = req.query;
    let doc = await unis.findOne(query);
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
    sort.users = -1;
    if (to-from > MAX_RESULTS) {
      res.status(400).send('Max results:',MAX_RESULTS);
      return;
    }
    let docs = await unis.aggregate([
      {$sort: sort},
      {$skip: from},
      {$limit: to-from},
      {$project: {
        name: 1,
        rating: 1,
        users: 1
      }}
    ])
    res.json(docs);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.get('/rank', async function(req,res,next) {
  try {
    let query = req.query;
    let name = query.name;
    let uni = await unis.findOne({name});
    let field = query.field;
    let queryField = 'rating.'+field;
    let db_query = {};
    db_query[queryField] = {
      $gt: uni.rating[field]
    }
    let greater = await unis.aggregate([
      {$match: db_query},
      {$count: "count"}
    ])
    let sameRating = await unis.aggregate([
      {$match: {[queryField]: uni.rating[field]}},
      {$sort: {[queryField]: -1,users: -1}}
    ])
    let index;
    for (let i in sameRating) {
      if (sameRating[i].name === uni.name) {
        index = parseInt(i);
        break;
      }
    }
    console.log(sameRating)
    res.json(index + greater[0].count);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})


module.exports = router;
