const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const sharp = require('sharp');
const monk = require('monk');
const majors = require('../../data/majors.json');
const MIN_PLAYERS = 5;
const saltRounds = 12;


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
    let user = req.get('user');
    console.log(name);
    // check name
    let exists = await db.teams.findOne({name: name});
    if (exists) {
      res.status(400).send('name used');
      return;
    }
    // creates id,=
    let _id = monk.id();
    // inserts team
    let createTeam = async (_id,name) => {
      let team = await db.teams.insert({
        _id,
        name,
        players: [user],
        admins: [user]
      })
      return team;
    }
    // update user
    let end = await Promise.all([
      createTeam(_id,name),
      db.users.findOneAndUpdate(user,{
        $push: {
          teams: {
            _id,
            admin: true
          }
        },
      })
    ])
    res.json(end[0]);
  } catch (err) {
    console.log(err);
  }

})

router.post('/invite', async function(req,res,next) {
  try {
    let team = req.query.team;
    let invited = req.query.invited;
    let invitation = await db.users.findOneAndUpdate(invited,{
      $push: {
        'news.teams.invitations': team
      }
    })
    res.sendStatus(200);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.post('/challenge', async function(req,res,next) {
  try {
    let team = req.query.team;
    let enemy = req.query.enemy;
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});



module.exports = router;
