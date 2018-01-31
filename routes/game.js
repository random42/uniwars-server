const express = require('express');
const router = express.Router();
const db = require('../db');
const games = db.get('games');
const questions = db.get('qriusity_questions');
const users = db.get('users');

router.get('/question', function(req, res, next) {

});

module.exports = router;
