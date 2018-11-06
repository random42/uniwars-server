import express from 'express'
const { HTTP, PROJECTIONS } = require('../../api/api')
import { db } from '../utils/db'
const debug = require('debug')('http:user')
import { fs } from 'fs'
import bcrypt from 'bcrypt'
import sharp from 'sharp'
import { socket } from '../socket'
import path from 'path'
const project_path = __dirname.slice(0,__dirname.indexOf(path.basename(__dirname)))
import monk from 'monk'
const baseURL = 'http://localhost:3000'
const picSize = {
  small: 100,
  medium: 256,
  large: 500
}
const {
  DEFAULT_PERF,
  PAGE_RESULTS,
  USERNAME_LENGTH
} = require('../constants')
const rankSort = {
  'games.solo': -1
}
import models from '../models'
// see https://github.com/kelektiv/node.bcrypt.js
const saltRounds = 12;

export const router = express.Router()

router.get('/', async function(req, res, next) {
  const { _id, project } = req.query
  if (!_id || !project || HTTP.USER.GET_USER.params.project.indexOf(project) < 0)
    return res.sendStatus(400)
  let doc
  switch (project) {
    case 'full': {
      doc = await models.user.getFull({user: _id})
      break;
    }
    case 'small': {
      doc = await models.user.getSmall({user: _id})
    }
  }
  if (!doc)
    return res.sendStatus(404)
  doc.online = socket.server.connections.has(_id)
  res.json(doc)
})

router.get('/search', async function(req, res, next) {
  let { text, page } = req.query
  if (!text || !page || isNaN(page) || text.length > USERNAME_LENGTH.MAX)
    return res.sendStatus(400)
  page = parseInt(page)
  let regex = new RegExp(text);
  let pipeline = [
    {
      $match: {
        username: {
          $regex: regex,
          // case insensitive
          $options: 'i',
        }
      }
    },
    // match text in username and full_name
    {
      $skip: page * PAGE_RESULTS
    },
    {
      $limit: PAGE_RESULTS
    },
    {
      $project: {
        username: 1,
        picture: 1,
      }
    }
  ]
  let docs = await db.users.aggregate(pipeline)
  res.json(docs)
})

// TODO
router.delete('/',async function(req,res,next) {
  try {
    let query = {_id: req.get('user')};
    let body = req.body;
    let doc = await db.users.findOne(query,'private','picture');
    // check password
    let check_password = await bcrypt.compare(body.password,doc.private.password);
    if (check_password) {
      // delete profile picture
      if (doc.picture && doc.picture.small.indexOf(baseURL) > 0) {
        let pic_path = project_path + 'public/images/profile_pictures/';
        let operations = []
        for (let size in picSize) {
          operations.push(
            new Promise((res,rej) => {
              fs.unlink(pic_path + size + '/' + query._id + '.png',(err) => {
                if (err) {
                  console.log(err)
                  rej()
                }
                else res()
              });
            })
          )
        }
        try {
          await Promise.all(operations);
        } catch (err) {
          console.log(err);
        }
      }
      let db_delete = await db.users.findOneAndDelete(query);
      res.sendStatus(200);
    } else {
      res.status(400).send('wrong password');
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.get('/top', async function(req,res,next) {
  let { from, to } = req.query
  if (isNaN(from) || isNaN(to))
    return res.sendStatus(400)
  from = parseInt(from)
  to = parseInt(to)
  let docs = await models.user.top({from, to})
  res.json(docs)
})

//TODO
router.get('/rank', async function(req,res,next) {
})

router.get('/picture', async function(req,res,next) {
  let _id = req.query._id;
  let size = req.query.size;
  if (!_id || !size || ['small','medium','large'].indexOf(size) < 0) {
    res.sendStatus(400)
    return
  }
  let user = await db.users.findOne(_id, 'picture');
  if (!user) {
    return res.sendStatus(404)
  }
  if (typeof user.picture === 'string') {
    return res.redirect(user.picture)
  }
  let picture = user.picture[size];
  res.redirect(picture);
});

router.put('/picture', async function(req,res,next) {
  // header Content-Type must be application/octet-stream
  let _id = req.get('user')
  let picture = req.body
  let infos = await Promise.all([
    (sharp(picture).resize(picSize.large,picSize.large).toFile('./public/images/profile_pictures/large/'+_id+'.png')),
    (sharp(picture).resize(picSize.medium,picSize.medium).toFile('./public/images/profile_pictures/medium/'+_id+'.png')),
    (sharp(picture).resize(picSize.small,picSize.small).toFile('./public/images/profile_pictures/small/'+_id+'.png')),
    db.users.findOneAndUpdate(_id,{
      $set: {
        picture: {
          small: baseURL+'/images/profile_pictures/small/'+_id+'.png',
          medium: baseURL+'/images/profile_pictures/medium/'+_id+'.png',
          large: baseURL+'/images/profile_pictures/large/'+_id+'.png',
        }
      }
    })
  ])
  res.sendStatus(200)
})

router.put('/add-friend', async function (req, res, next) {
  let user = req.get('user')
  let { to } = req.query
  await db.users.findOneAndUpdate(to, {
    $addToSet: {
      'private.news': {
        'type': 'friend_request',
        'user': monk.id(user)
      }
    }
  })
  res.sendStatus(200)
})

router.put('/respond-friend-request', async function (req, res, next) {
  let user = req.get('user')
  let { to, response } = req.query
  user = monk.id(user)
  to = monk.id(to)
  let update = await db.users.findOneAndUpdate({
    _id: user,
    'private.news': {
      type: 'friend_request',
      user: to
    }
  }, {
    $pull: {
      'private.news': {
        type: 'friend_request',
        user: to
      }
    }
  }, {projection: {_id: 1}})
  if (!update) // then there was no friend request
    return res.sendStatus(400)
  if (response !== 'y') // then the request was rejected
    return res.sendStatus(200)
  let updates = [
    db.users.findOneAndUpdate(user, {
      $addToSet: {
        'friends': to
      }
    }),
    db.users.findOneAndUpdate(to, {
      $addToSet: {
        'friends': user
      }
    })
  ]
  await Promise.all(updates)
  res.sendStatus(200)
})

router.put('/remove-friend', async function(req, res, next) {
  let user = req.get('user')
  let { friends } = req.query
  if (!Array.isArray(friends))
    return res.sendStatus(400)
  await models.user.removeFriends({ user, friends })
  res.sendStatus(200)
})

function getUniByEmail(email) {
  let regex = /[a-z]+\.[a-z]+$/i
  let match = email.match(regex)
  if (!match || match.length !== 1)
    return
  let domain = match[0]
  return db.unis.findOne({domains:domain},['_id']);
}

function checkRegisterForm(user) {
  // password must have a,A,1 8-255 chars
  let maxLength = {
    first_name: 1024,
    last_name: 1024,
    email: 254,
    password: 255,
    major: 255,
    username: 20,
  }
  let regex = {
    first_name : /^[a-z]+(\s+[a-z]+)*$/i,
    last_name : /^[a-z]+(\s+[a-z]+)*$/i,
    email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    password: /^.{8,255}$/g,
    major: /^[a-z]+(\s+[a-z]+)*$/i,
    username: /^.{3,20}$/g,
  }
  // checks regex
  for (let field in user) {
    user[field] = user[field].trim();
    if (!(user[field].length <= maxLength[field] && regex[field].test(user[field]))) {
      return false;
    }
  }
  // checks phone
  if ('phone_number' in user && !(new PhoneNumber(user.phone_number).isValid())) {
    return false;
  }
  return true;
}
