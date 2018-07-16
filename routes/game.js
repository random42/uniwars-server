const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const bcrypt = require('bcrypt');
const monk = require('monk');

const game_types = [
  'solo',
  'squad',
  'team',
]

router.put('/stuff', async (req,res,next) => {
  try {

  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

module.exports = router;
