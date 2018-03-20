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

});



module.exports = router;
