const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const bcrypt = require('bcrypt');
const sharp = require('sharp');
const monk = require('monk');
const majors = require('../assets/majors.json');
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

router.delete('/', async function(req,res,next) {
  try {
    let user = req.get('user');
    let team = req.query.team;
    let doc = await db.teams.findOne({
      _id: team,
      founder: user
    });
    if (!doc) { // team non esistente o utente non founder
      res.sendStatus(400);
      return;
    }
    let clean = await Promise.all([
      // toglie il team dai players
      db.users.update(
        // sono piu' i players in un team o i team a cui appartiene ogni player?
        { _id: {
            $in: doc.players
        }},
        {
          $pull: {
            teams: {
              _id: team
            }
          }
        }, {multi: true}
      ),
      // elimina il team
      db.teams.findOneAndDelete(team)
    ])
    res.sendStatus(200);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.get('/top', async function(req,res,next) {
  try {

  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.get('/rank', async function(req,res,next) {
  try {

  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.post('/create', async function(req,res,next) {
  try {
    let name = req.body.name;
    let user = req.get('user');
    let user_id = monk.id(user);
    // check name
    let exists = await db.teams.findOne({name: name});
    if (exists) {
      res.status(400).send('name used');
      return;
    }
    // creates id,
    let _id = monk.id();
    // inserts team
    let createTeam = async (_id,name) => {
      let team = await db.teams.insert({
        _id,
        name,
        founder: user_id,
        players: [user_id],
        admins: [user_id]
      })
      return team;
    }
    let end = await Promise.all([
      createTeam(_id,name),
      // update user
      db.users.findOneAndUpdate(user,{
        $push: {
          teams: _id
        },
      })
    ])
    res.json(end[0]);
  } catch (err) {
    console.log(err);
  }

})

router.put('/invite', async function(req,res,next) {
  try {
    let user = req.get('user');
    let team = req.query.team;
    let invited = req.query.invited;
    let invitation = await db.users.findOneAndUpdate({
      _id: invited,
      'news.teams.invitations': {$ne: {team}}
    },{
      $push: {
        'news.teams.invitations': {
          user,team
        }
      }
    })
    if (!invitation) {
      res.status(400).send('already invited');
      return;
    }
    res.sendStatus(200);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.put('/respond-invite', async function(req,res,next) {
  try {
    let team = req.query.team;
    let user = req.get('user');
    let response = req.query.response;
    if (response === 'y') {
      let updateUser = await db.users.findOneAndUpdate({_id: user,
        'news.teams.invitations': team
      },{
        $pull: {
          'news.teams.invitations': {
            team
          }
        },
        $push: {
          teams: monk.id(team)
        }
      });
      if (!updateUser) { // no invitation found
        res.sendStatus(400);
        return;
      }
      let updateTeam = await
        // join team
        db.teams.findOneAndUpdate(team,{
          $push: {
            players: monk.id(user)
          }
        })
    }
    else {
      let updateUser = await db.users.findOneAndUpdate({_id: user,
        'news.teams.invitations': team
      },{
        $pull: {
          'news.teams.invitations': {
            team
          }
        }
      });
      if (!updateUser) { // no invitation found
        res.sendStatus(400);
        return;
      }
    }
    res.sendStatus(200);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.put('/challenge', async function(req,res,next) {
  try {
    let user = req.get('user');
    let team = req.query.team;
    let enemy = req.query.enemy;
    // add news in team doc
    let update = await db.teams.findOneAndUpdate({
      _id: enemy,
      challenges: {$ne: team}
    },{
      $push : {
        challenges: team
      }
    })
    if (!update) {
      res.status(400).send('already challenged');
      return;
    }
    // add news in founder doc
    let news = await db.users.findOneAndUpdate({
      _id: update.founder
    },{
      $push: {
        news: {
          type: "team_challenge",
          user,
          team,
          created_at: Date.now()
        }
      }
    })
    res.sendStatus(200);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.put('/respond-challenge', async function(req,res,next) {
  try {
    let response = req.query.response;
    let user = req.get('user');
    let team_id = req.query.team;
    let enemy_id = req.query.enemy;
    // remove challenge from user team doc
    let enemy = await db.teams.findOneAndUpdate({
      _id: team_id,
      challenges: enemy_id
    },{
      $pull: {
        challenges: enemy_id
      }
    })
    if (!enemy) { // no challenge
      res.sendStatus(400);
      return;
    }
    if (response !== 'y') {
      res.sendStatus(200);
      return;
    }
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})





module.exports = router;
