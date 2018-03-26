const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const sharp = require('sharp');
const monk = require('monk');
const majors = require('../../data/majors.json');
const MIN_PLAYERS = 5;
const saltRounds = 12;

async function checkLoginToken(query,loginToken) {
  //return true;
  try {
    let doc = await db.users.findOne(query,'private');
    let right = await bcrypt.compare(loginToken,doc.private.loginToken);
    return right;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function checkTeamToken(query,token) {
  try {
    let team = await db.teams.findOne(query);
    let right = await bcrypt.compare(token,team.token);
    return right;
  } catch(err) {
    console.log(err)
  }
}

router.get('/', async function(req,res,next) {
  let query = req.query;
  let team = await db.teams.findOne(query);
  if (!team) {
    res.sendStatus(404);
  } else {
    res.json(team);
  }
});

router.post('/create',async function(req,res,next) {
  try {
    let name = req.body.name;
    let user = req.body.user;
    console.log(name);
    // TODO check token
    // check name
    let exists = await db.teams.findOne({name: name});
    if (exists) {
      res.status(400).send('name used');
      return;
    }
    // creates id, token
    let _id = monk.id();
    let teamToken = monk.id().toString();
    // hashes token and inserts team
    let createTeam = async (_id,name,token) => {
      let hash = await bcrypt.hash(token,saltRounds);
      let team = await db.teams.insert({
        _id,
        name,
        players: [user],
        admins: [user],
        token: hash
      })
      return team;
    }
    // update user
    let end = await Promise.all([
      createTeam(_id,name,teamToken),
      db.users.findOneAndUpdate(user,{
        $push: {
          teams: {
            _id
          },
          'private.team_tokens': {
            [_id] : teamToken
          }
        },
      })
    ])
    res.json([end[0],teamToken]);
  } catch (err) {
    console.log(err);
  }

})

router.post('/invite', async function(req,res,next) {
  try {
    let team = req.body.team;
    let token = req.body.teamToken;
    let invited = req.body.invited;
    // TODO
    let right = checkTeamToken(team,token);
    if (!right) {
      res.sendStatus(400);
      return;
    }
    let invitation = db.users.findOneAndUpdate(invited,{
      $push: {
        'news.teams.invitation': team
      }
    })

  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.post('/challenge', async function(req,res,next) {
  try {

  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});



module.exports = router;
