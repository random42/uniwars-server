const express = require('express');
const router = express.Router();
const { HTTP, PROJECTIONS } = require('../api/api');
const db = require('../utils/db');
const debug = require('debug')('http:users');
const fs = require('fs');
const bcrypt = require('bcrypt');
const path = require('path');
const project_path = __dirname.slice(0,__dirname.indexOf(path.basename(__dirname)));
const sharp = require('sharp');
const monk = require('monk');
const baseURL = 'http://localhost:3000';
const picSize = {
  small: 100,
  medium: 256,
  large: 500
}
const MAJORS = require('../assets/majors.json');
const PhoneNumber = require('awesome-phonenumber');
const extern_login = ['facebook.com','google.com'];
const DEFAULT_PERF = {
  rating: 1500,
  rd: 100,
  vol: 0.06
}
const rankSort = {
  'games.solo': -1
}
const crud = require('../crud')
// see https://github.com/kelektiv/node.bcrypt.js
const saltRounds = 12;

// TODO online time on socket auth and disconnect

router.get('/', async function(req,res,next) {
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
  res.json(doc)
})

router.get('/search', async function(req,res,next) {
  try {
    debug('asdsasd')
    const PAGE_RESULTS = 20;
    let { text, page } = req.query;
    page = parseInt(page);
    let check = () => {
      return
      text.length < 1024 &&
      (page ||
      page === 0)
    }
    if (!check()) return;
    let pipeline = {
      // match text in username and full_name
      $match: {
        username: {
          $regex: text,
          // case insensitive
          $options: 'i',
        }
      },
      $skip: page * PAGE_RESULTS,
      $limit: PAGE_RESULTS,
      $project: {
        username: 1,
        picture: 1,
      }
    }
    // if text has only letters then search on full_name too
    if (!(/\W/.test(text))) {
      debug('only letters');
      pipeline.$match.full_name = {
        $regex: text,
        // case insensitive
        $options: 'i',
      }
    }
    // query
    let results = await db.users.aggregate(pipeline);
    res.json(results);
  } catch(err) {
    res.sendStatus(500);
  }
})

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
                  console.log(err);
                  rej();
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
  try {
    let from = parseInt(req.query.from);
    let to = parseInt(req.query.to);
    let field = 'perf.rating';
    let sort = {};
    sort[field] = -1;
    sort = {...sort,...rankSort}
    let projection = {
      username: 1,
      perf: 1,
      uni: 1,
      picture: 1,
      online: 1,
    }
    res.sendStatus(200);
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

router.put('/login', async function(req, res, next) {
  // TODO maybe set online offline user in db
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
  // password correct
  // generate user access token
  let token = monk.id().toString()
  // hash login_token
  let hash = await bcrypt.hash(token, saltRounds)
  let updatedDoc = await db.users.findOneAndUpdate(doc._id, {
    $set: {
      'private.access_token': hash,
    },
  })
  res.json({user: doc, token});
});

router.put('/logout', async function(req,res,next) {
  try {
    let user = req.get('user');
    let doc = await db.users.findOneAndUpdate(user,{
      $inc: { online_time: (Date.now() - monk.id(token).getTimestamp())},
      $set: {
        online: false,
        'private.access_token': null,
      }
    });
    res.sendStatus(200);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.get('/picture', async function (req,res,next) {
  let _id = req.query._id;
  let size = req.query.size;
  if (!_id || (size && !(size in picSize))) {
    res.sendStatus(400);
    return
  }
  let user = await db.users.findOne(_id,'picture');
  if (!user) {
    res.sendStatus(404)
    return
  }
  if (typeof user.picture === 'string') {
    res.redirect(user.picture);
    return
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
});

router.put('/picture', async function(req,res,next) {
  // set headers Content-Type to application/octet-stream
  let query = {_id: req.get('user')};
  let _id = req.get('user');
  let picture = req.body;
  let infos = await Promise.all([
    (sharp(picture).resize(picSize.large,picSize.large).toFile('./public/images/profile_pictures/large/'+_id+'.png')),
    (sharp(picture).resize(picSize.medium,picSize.medium).toFile('./public/images/profile_pictures/medium/'+_id+'.png')),
    (sharp(picture).resize(picSize.small,picSize.small).toFile('./public/images/profile_pictures/small/'+_id+'.png')),
    db.users.findOneAndUpdate(query,{
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

router.put('/add-friend', async function (req,res,next) {
  try {
    let from = req.get('user');
    let to = req.query.to;
    let update = await db.users.findOneAndUpdate({
      _id: to,
      'news': {$ne: { // not pushing news if there is one friend_request pending
        type: "friend_request",
        user: from
      }}
    },{
      $push: {
        'news': {
          type: "friend_request",
          user: from,
          created_at: Date.now(),
        }
      }
    });
    if (!update) {
      res.sendStatus(400);
      return;
    }
    res.sendStatus(200);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.put('/get-news', async function(req,res,next) {
  try {
    let user = req.get('user');
    let doc = await db.findOne(user,'news');
    res.json(doc.news || []);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.put('/respond-friend-request', async function (req,res,next) {
  try {
    let response = req.query.response;
    let user = req.get('user');
    let friend = req.query.user;
    let remove_news = await db.users.findOneAndUpdate({
      _id: user,
      news: { // verify the request
        type: "friend_request",
        user: friend
      }
    },{
      $pull: {
        news: {
          type: "friend_request",
          user: friend
        }
      }
    });
    if (!remove_news) { // there was no friend request
      res.sendStatus(400);
      return;
    }
    if (response !== 'y') {
      res.sendStatus(200);
      return;
    }
    // update friends array
    let ops = await Promise.all([
      db.users.findOneAndUpdate(user,{
        $push: {
          friends: friend
        }
      }),
      db.users.findOneAndUpdate(friend,{
        $push: {
          friends: user
        }
      })
    ])
    res.sendStatus(200);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.put('/challenge', async function (req,res,next) {
  try {
    let from = req.get('user');
    let to = req.query.to;
    let update = await db.users.findOneAndUpdate({
      _id: to,
      news: {$ne: {
        type: "challenge",
        user: from
      }}
    },{
      $push: {
        news: {
          type: "challenge",
          user: from,
          created_at: Date.now()
        }
      }
    })
    if (!update) {
      res.sendStatus(400);
      return;
    }
    res.sendStatus(200);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.put('/respond-challenge', async function (req,res,next) {
  try {
    let response = req.query.response;
    let user = req.get('user');
    let enemy_id = req.query.user;
    let remove_news = await db.users.findOneAndUpdate({
      _id: user,
      news: {
        type: "challenge",
        user: enemy_id
      }
    },{
      $pull: {
        news: {
          type: "challenge",
          user: enemy_id
        }
      }
    })
    if (!remove_news) {
      res.sendStatus(400);
      return;
    }
    if (response !== 'y') {
      res.sendStatus(200);
      return;
    }
    let enemy = await db.users.findOne(enemy,['online','playing']);
    if (enemy.online && !enemy.playing) {
      //TODO start game
      res.sendStatus(200);
    } else {
      res.status(201).json(enemy);
    }
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

function getUniByEmail(email) {
  let regex = /[a-z]+\.[a-z]+$/i;
  let domain = email.match(regex)[0];
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
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,255}$/g,
    major: /^[a-z]+(\s+[a-z]+)*$/i,
    username: /^.*$/g,
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

module.exports = router;
