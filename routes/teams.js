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

// TODO
router.get('/rank', async function(req,res,next) {
  try {
    let team = req.query.team;
    let enemy = req.query.enemy;
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});
//TODO
router.get('/top', async function(req,res,next) {
  try {
    let team = req.query.team;
    let enemy = req.query.enemy;
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.post('/create', async function(req,res,next) {
  try {
    let name = req.body.name;
    let user = req.get('user');
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
        founder: user,
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
            admin: true,
            founder: true
          }
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
    let invitation = await db.users.findOneAndUpdate(invited,{
      $push: {
        'news.teams.invitations': {
          user,team
        }
      }
    })
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
      let operations = await Promise.all([
        // cancel invitation and add team
        db.users.findOneAndUpdate(user,{
          $pull: {
            'news.teams.invitations': {
              team
            }
          },
          $push: {
            teams: {
              _id: team
            }
          }
        }),
        // join team
        db.teams.findOneAndUpdate(team,{
          $push: {
            players: user
          }
        })
      ])
    }
    else if (response === 'n') {
      // cancel invitation and add team
      await db.users.findOneAndUpdate(user,{
        $pull: {
          'news.teams.invitations': {
            team
          }
        },
        $push: {
          teams: {
            _id: team
          }
        }
      })
    } else {
      res.sendStatus(400);
      return;
    }
    res.sendStatus(200);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.put('/challenge', async function(req,res,next) {
  try {
    let team = req.query.team;
    let enemy = req.query.enemy;
    let update = await db.teams.findOneAndUpdate(enemy,{
      $push : {
        challenges: team
      }
    })
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.put('/respond-challenge', async function(req,res,next) {
  try {
    let team = req.query.team;
    let enemy = req.query.enemy;
    let response = req.query.response;
    if (response === 'y') {
      let update = await db.teams.findOneAndUpdate(team,{
        $pull : {
          challenges: enemy
        }
      })
      // TODO create game
    } else if (response === 'n') {
      let update = await db.teams.findOneAndUpdate(team,{
        $pull : {
          challenges: enemy
        }
      })
    } else {
      res.sendStatus(400);
      return;
    }
    res.sendStatus(200);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})





module.exports = router;
