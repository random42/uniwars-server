import express from 'express'
const router = express.Router()
const { HTTP, PROJECTIONS } = require('../../api/api')
import db from '../utils/db'
const debug = require('debug')('http:user')
import fs from 'fs'
import bcrypt from 'bcrypt'
import socket from '../socket'
import path from 'path'
const project_path = __dirname.slice(0,__dirname.indexOf(path.basename(__dirname)))
import sharp from 'sharp'
import monk from 'monk'
const baseURL = 'http://localhost:3000'
const picSize = {
  small: 100,
  medium: 256,
  large: 500
}
import MAJORS from '../../assets/majors.json'
const {
  DEFAULT_PERF,
  PAGE_RESULTS,
  USERNAME_LENGTH
} = require('../utils/constants')
const rankSort = {
  'games.solo': -1
}
import crud from '../crud'
// see https://github.com/kelektiv/node.bcrypt.js
const saltRounds = 12;


router.get('/', async function(req, res, next) {
  const { _id, project } = req.query
  if (!_id || !project || HTTP.USER.GET_USER.params.project.indexOf(project) < 0)
    return res.sendStatus(400)
  let doc
  switch (project) {
    case 'full': {
      doc = await crud.user.getFull({user: _id})
      break;
    }
    case 'small': {
      doc = await crud.user.getSmall({user: _id})
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
  let docs = await crud.user.top({from, to})
  res.json(docs)
})

//TODO
router.get('/rank', async function(req,res,next) {
})

router.put('/login', async function(req, res, next) {
  let body = req.body
  let { user } = req.query
  let doc = await db.users.findOne({
    $or: [
      {username: user},
      {email: user}
    ]
  })
  if (!doc) return res.sendStatus(404)
  let auth = await bcrypt.compare(body.password,doc.private.password)
  if (!auth) return res.status(400).send("Wrong Password")
  // password is correct
  // generate user access token
  let token = monk.id().toString()
  // hash access token
  let hash = await bcrypt.hash(token, saltRounds)
  let updatedDoc = await db.users.findOneAndUpdate(doc._id, {
    $set: {
      'private.access_token': hash,
    },
  })
  res.json({user: doc, token});
});


// TODO
router.put('/logout', async function(req,res,next) {
});

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

router.post('/register', async function(req, res, next) {
  let user = req.body
  let { email } = user
  if (!checkRegisterForm(user)) {
    res.sendStatus(400);
    return;
  }
  let uni = await getUniByEmail(user.email);
  if (!uni) {
    res.status(400).send('Invalid email domain');
    return;
  }
  let existEmail = await db.users.findOne({email});
  if (existEmail) {
    res.status(400).send('Account already exists');
    return;
  }
  let existUsername = await db.users.findOne({username: user.username});
  if (existUsername) {
    res.status(400).send('Username is already used.');
    return;
  }
  user.uni = monk.id(uni._id)
  user.private = {}
  user.perf = DEFAULT_PERF
  user.stats = []
  user.friends = []
  let hash = await bcrypt.hash(user.password,saltRounds);
  user.private.password = hash;
  delete user.password;
  await db.users.insert(user);
  res.sendStatus(200)
})

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
  await crud.user.removeFriends({ user, friends })
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

export default router;
