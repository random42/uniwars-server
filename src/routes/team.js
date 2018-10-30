import express from 'express';
export const router = express.Router()
import { db } from '../utils'
import monk from 'monk'
import { models } from '../models'
const debug = require('debug')('http:team')
const {
  MAX_TEAM_MEMBERS
} = require('../constants')
import { majors } from '../../assets/majors.json';
const MIN_PLAYERS = 5


router.get('/', async function(req,res,next) {
  let { _id, project } = req.query
  if (!_id) return res.sendStatus(400)
  let doc = await models.team.fetchWithUsers({_id})
  if (!doc) return res.sendStatus(404)
  res.json(doc)
})

router.delete('/', async function(req,res,next) {
  let user = req.get('user');
  let team = req.query.team;
  let doc = await db.teams.findOne({
    _id: team,
    founder: user
  });
  if (!doc) // team non esistente o utente non founder
    return res.sendStatus(400)
  let ops = await models.team.delete({ team })
  if (ops) res.sendStatus(200)
  else res.sendStatus(400)
})

router.get('/top', async function(req,res,next) {
  let { from, to } = req.query
  if (isNaN(from) || isNaN(to))
    return res.sendStatus(400)
  from = parseInt(from)
  to = parseInt(to)
  let docs = await models.team.top(req.query)
  res.json(docs)
})

// TODO
router.get('/rank', async function(req,res,next) {
})

router.post('/create', async function(req,res,next) {
  let { name, invited } = req.body
  let user = req.get('user')
  // check name
  let exists = await db.teams.findOne({name});
  if (exists) {
    res.status(400).send('Name already taken');
    return
  }
  // inserts team
  let doc = await models.team.create({name, founder: user, users: invited})
  res.json(doc)
})

router.put('/invite', async function(req,res,next) {
  let user = req.get('user')
  let { team, invited } = req.query
  if (!team || !Array.isArray(invited))
    res.sendStatus(400)
  let invitation = await db.users.update({
    _id: {
      $in: invited
    },
    // will not send invitation to team users
    teams: {
      $not: team
    }
  },
  {
    $push: {
      'private.news': {
        'type': 'team_invitation',
        'team': monk.id(team),
        'user': monk.id(user)
      }
    }
  },{multi: true, projection: {_id: 1}})
  res.sendStatus(200);
});

router.put('/respond-invite', async function(req,res,next) {
  let user = req.get('user')
  let { team, response } = req.query
  if (!team || !response)
    return res.sendStatus(400)
  let update = await db.users.findOneAndUpdate({
    _id: user,
    'private.news': {
      'type': 'team_invitation',
      team
    }
  },{
    $pull: {
      'private.news': {
        'type': 'team_invitation',
        team
      }
    }
  },{projection: { _id: 1}})
  if (!update) // no invitation
    return res.sendStatus(400)
  if (response !== 'y')
    return res.sendStatus(200)
  else {
    await models.team.addMember({team, user})
    res.sendStatus(200)
  }
})

router.put('/challenge', async function(req,res,next) {
  let user = req.get('user')
  let { team, enemy } = req.query.team
  if (!team || !enemy) return res.sendStatus(400)
  const pass = await check({
    users: [user],
    team,
    areAdmins: true
  })
  if (!pass) return res.sendStatus(400)
  await db.teams.findOneAndUpdate(enemy, {
    $addToSet: {
      'challenges': monk.id(team)
    }
  })
  res.sendStatus(200)
});

router.put('/respond-challenge', async function(req,res,next) {
  let user = req.get('user')
  let { team, enemy, response } = req.query
  if (!(team && enemy && response))
    return res.sendStatus(400)
  const pass = await check({
    users: [user],
    team,
    areAdmins: true
  })
  if (!pass) return res.sendStatus(400)
  let removeNews = await db.teams.findOneAndUpdate(team, {
    $pull: {
      'challenges': enemy
    }
  })
  if (response !== 'y') return res.sendStatus(200)
  // TODO start game if possible
})


const check = async ( {
  users,
  team, // can be _id or team object
  areInTeam,
  areNotInTeam,
  areAdmins,
  }) => {
  const doc = typeof(team) === 'string' ? await db.findOne(team) : team
  if (!doc) return false
  if (areInTeam) {
    for (let u of users) {
      if (!_.find(doc.users, {_id: u}))
        return false
    }
  }
  if (areAdmins) {
    for (let u of users) {
      if (!_.find(doc.users, {_id: u, admin: true}))
        return false
    }
  }
  if (areNotInTeam) {
    for (let u of users) {
      if (_.find(doc.users, {_id: u}))
        return false
    }
  }
  return true
}
