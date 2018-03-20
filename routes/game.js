const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const games = db.get('games');
const questions = db.get('qriusity_questions');
const users = db.get('users');
const search = db.get('search');
const monk = require('monk');
const Semaphore = require('await-semaphore').Semaphore;

let search_sem = new Semaphore(2);

let queue = {
  _1v1: [],
  _5v5: [],
}

async function checkLoginToken(query,loginToken) {
  try {
    let doc = await users.findOne(query,'private');
    let right = await bcrypt.compare(loginToken,doc.private.loginToken);
    return right;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function checkGameToken(query,token) {
  try {
    let doc = await games.findOne(query,'token');
    let right = await bcrypt.compare(token,doc.token);
    return right;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function createGame(type,players) {
  try {
    let token = monk.id().toString();
    let hash = await bcrypt.hash(token,12);
    await games.insert({
      type,
      players,
      questions: [],
      on_play: true,
      created_at: Date.now(),
      token: hash,
    });
    return token;
  } catch(err) {
    console.log(err);
  }
}

router.get('/question', async (req, res, next) => {

});

router.post('/search', async (req, res, next) => {
  try {
    let body = req.body; // loginToken,gameType
    let query = req.query; // id/username,
    let player = await users.findOne(query,['private','rating']);
    let queueLength;
    player && await bcrypt.compare(body.loginToken,player.private.loginToken) && // check token
    search_sem[0].use(() => {
      queue['_'+body.gameType].push(player);
    })

    res.sendStatus(200);

  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }

})

router.post('/challenge')

module.exports = router;
