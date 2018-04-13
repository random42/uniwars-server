const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const monk = require('monk');

const game_types = [
  'solo',
  'squad',
  'team',
]

router.post('/search', async (req, res, next) => {
  try {
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

router.put('/stuff', async (req,res,next) => {
  try {

  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

module.exports = router;
