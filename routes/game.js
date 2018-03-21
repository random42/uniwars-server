const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const games = db.get('games');
const questions = db.get('qriusity_questions');
const users = db.get('users');
const search = db.get('search');
const monk = require('monk');
const Matchmaking = require('../algorithms/matchmaking');


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

router.get('/question', async (req, res, next) => {

});

router.post('/search', async (req, res, next) => {
  try {
    let body = req.body; // loginToken,gameType
    let gameType = body.gameType
    let query = req.query; // id/username,
    let player = await users.findOne(query,['rating','private','uni','major']);
    console.log(player);
    player._id = player._id.toString();
    player.uni._id = player.uni._id.toString();
    player.response = res;
    //player && await bcrypt.compare(body.loginToken,player.private.loginToken) && // check token
    await Matchmaking[gameType].push(player);
    if (Matchmaking[gameType].queue.length === 2) {
      Matchmaking[gameType].match();
    }
    //res.sendStatus(200);

  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }

})

router.post('/challenge')

module.exports = router;
