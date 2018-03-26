const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const monk = require('monk');


async function checkLoginToken(query,loginToken) {
  try {
    let doc = await db.users.findOne(query,'private');
    let right = await bcrypt.compare(loginToken,doc.private.loginToken);
    return right;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function checkGameToken(query,token) {
  try {
    let doc = await db.games.findOne(query,'token');
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
    let prefix = '_';
    let body = req.body; // loginToken,gameType
    let gameType = body.gameType
    let query = req.query; // id/username,
    let player = await db.users.findOne(query,['rating','private','uni','major']);
    console.log(player);
    player._id = player._id.toString();
    player.uni._id = player.uni._id.toString();
    player.response = res;
    //TODO
    res.sendStatus(200);

  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }

})


router.post('/challenge-team', async (req,res,next) => {
  let
})

module.exports = router;
