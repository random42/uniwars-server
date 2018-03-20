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

router.get('/rank', async function(req,res,next) {
  try {

  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});



module.exports = router;
