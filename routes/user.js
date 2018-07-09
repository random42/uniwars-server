const express = require('express');
const router = express.Router();
const db = require('../db');
const debug = require('debug')('http:users');
const fs = require('fs');
const bcrypt = require('bcrypt');
const path = require('path');
const project_path = __dirname.slice(0,__dirname.indexOf(path.basename(__dirname)));
const sharp = require('sharp');
const monk = require('monk');
const baseURL = 'http://localhost:3000';
const picSize = {
  small: 50,
  medium: 256,
  large: 500
}
const majors = require('../../data/majors.json');
const PhoneNumber = require('awesome-phonenumber');
const extern_login = ['facebook.com','google.com'];
const Rank = require('../utils/rank');
const DEFAULT_PERF = {
  rating: 1500,
  rd: 100,
  vol: 0.06
}
const rankSort = {
  'games.solo': -1
}
// see https://github.com/kelektiv/node.bcrypt.js
const saltRounds = 12;

router.get('/', async function (req,res,next) {
  try {
    let query = req.query;
    if (!query) {
      res.sendStatus(400);
      return;
    }
    let docs = await db.users.aggregate([
      {
        $match: query
      },
      {
        $lookup: {
          from: 'unis',
          localField: 'uni',
          foreignField: '_id',
          as: 'uni'
        }
      },
      {
        $lookup: {
         from: 'teams',
         localField: 'teams',
         foreignField: '_id',
         as: 'teams'
       }
      },
      {
        $project: {
          'uni.web_pages': 0,
          'uni.domains': 0,
          'uni.perf': 0,
          'private': 0,
          'news': 0,
          'friends': 0,
        }
      }
    ])
    if (docs.length !== 1) {
      res.sendStatus(500);
      return;
    }
    res.json(docs[0]);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }

});

/*
  query: {
    page: 12,
    text: "sdd"
  }
*/
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
      if (doc.picture.small.indexOf(baseURL) > 0) {
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
    res.statusSend(500);
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
    let docs = await Rank.top({from,to,coll: db.users,sort,projection})
    if (!docs) {
      res.sendStatus(400);
      return;
    }
    res.json(docs);
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
  try {
    // TODO maybe set online offline user in db
    let body = req.body;
    let query = req.query;
    let doc = await db.users.findOne(query);
    if (doc) {
      // if (doc.online) {
      //   res.status(400).send('Already logged in');
      //   return;
      // }
      // check password
      let done = await bcrypt.compare(body.password,doc.private.password)
      if (done) {
        // password correct
        // generate client login_token
        let login_token = monk.id().toString();
        // hash login_token
        let hash = await bcrypt.hash(login_token,saltRounds);
        let updatedDoc = await db.users.findOneAndUpdate(query,{
          $set: {
            'private.login_token': hash,
            online: true,
          },
        });
        res.json({user: doc,token: login_token});
      }
      else {
        res.status(400).send('wrong password'); // wrong password
      }
    }
    else {
      res.status(400).send('wrong email or username'); // wrong username or email
    }
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.put('/logout', async function(req,res,next) {
  try {
    let user = req.get('user');
    let token = req.get('login_token');
    let doc = await db.users.findOneAndUpdate(user,{
      $inc: { online_time: (Date.now() - monk.id(token).getTimestamp())},
      $set: {
        online: false,
        'private.login_token': null,
      }
    });
    res.sendStatus(200);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.get('/picture',async function (req,res,next) {
  try {
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
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.post('/register', async function(req, res, next) {
  try {
    let user = req.body;
    let email = user.email;
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
    else {
      user.uni = uni._id;
      if (user.first_name && user.last_name) user.full_name = user.first_name+' '+user.last_name;
      user.private = {};
      user.perf = DEFAULT_PERF;
      user.activity = [];
      user.friends = [];
      if (user.phone_number) {
        user.private.phone_number = user.phone_number;
        delete user.phone_number;
        //TODO phone verification
      } else if (user.password) {
        let hash = await bcrypt.hash(user.password,saltRounds);
        user.private.password = hash;
        delete user.password;
      }
      db.users.insert(user).then(doc => {
        res.sendStatus(200);
      }).catch(err => console.log(err))
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.put('/picture', async function(req,res,next) {
  // set headers Content-Type to application/octet-stream
  try {
    let query = {_id: req.get('user')};
    let _id = req.get('user');
    let picture = req.body;
    let infos = await Promise.all([
    (sharp(picture)
    .resize(picSize.large,picSize.large)
    .toFile('./public/images/profile_pictures/large/'+_id+'.png')),
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
    ]);
    res.json(infos[3]);
  }
  catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
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
    username: /^(\w|\d){3,20}$/g,
  }
  // checks regex
  for (let field in user) {
    user[field] = user[field].trim();
    if (!(user[field].length <= maxLength[field] && regex[field].test(user[field]))) {
      return false;
    }
  }
  // checks major
  if ('major' in user) {
    if (majors.indexOf(user.major.toUpperCase()) < 0) {
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
