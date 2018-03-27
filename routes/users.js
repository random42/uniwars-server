const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
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
// see https://github.com/kelektiv/node.bcrypt.js
const saltRounds = 12;

router.get('/',async function (req,res,next) {
  let query = req.query;
  if (!query) {
    res.sendStatus(400);
    return;
  }
  let doc = await db.users.findOne(query,['-private','-news'])
  res.json(doc);
});

router.get('/login', async function(req, res, next) {
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
        res.json([doc,login_token]);
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
    let query = {_id: req.get('user')};
    let token = req.get('login_token');
    let doc = await db.users.findOneAndUpdate(query,{
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

router.get('/uni-by-email',function (req,res,next) {
  let email = req.query.email;
  getUniByEmail(email).then(doc => {
    res.json(doc);
  }).catch(err => {
    res.sendStatus(500);
  })
})

router.get('/picture',async function (req,res,next) {
  let _id = req.query._id;
  let size = req.query.size;
  if (!_id) {
    res.sendStatus(400);
  }
  let user = await db.users.findOne({_id},'picture');
  let picture = user.picture[size];
  res.redirect(picture);
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
      user.uni = {...uni};
      if (user.first_name && user.last_name) user.name = user.first_name+' '+user.last_name;
      user.created_at = Date.now();
      user.private = {};
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

router.delete('/account',async function(req,res,next) {
  try {
    let query = req.query;
    let body = req.body;
    let doc = await db.users.findOne(query,'private');
    if (!doc) {
      res.status(400).send('wrong query');
    }
    let checks = [await (bcrypt.compare(body.password,doc.private.password)),
      await (bcrypt.compare(body.login_token,doc.private.login_token))];
    if (checks[0] && checks[1]) {
      let deleted = await db.users.findOneAndDelete(query);
      console.log(deleted);
      res.sendStatus(200);
    } else {
      res.status(400).send('wrong login_token or password');
    }
  } catch (err) {
    console.log(err);
    res.statusSend(500);
  }
})

router.put('/picture', async function(req,res,next) {
  // set headers Content-Type to application/octet-stream
  try {
    let _id = req.query.user;
    if (!rightToken) {
      res.status(400).send('wrong login_token');
      return;
    }
    let picture = req.body;
    let infos = [
    await (sharp(picture)
    .resize(picSize.large,picSize.large)
    .toFile('./public/images/profile_pictures/large/'+_id+'.png')),
    await (sharp(picture).resize(picSize.medium,picSize.medium).toFile('./public/images/profile_pictures/medium/'+_id+'.png')),
    await (sharp(picture).resize(picSize.small,picSize.small).toFile('./public/images/profile_pictures/small/'+_id+'.png')),
    await db.users.findOneAndUpdate({_id},{
      $set: {
        picture: {
          small: baseURL+'/images/profile_pictures/small/'+_id+'.png',
          medium: baseURL+'/images/profile_pictures/medium/'+_id+'.png',
          large: baseURL+'/images/profile_pictures/large/'+_id+'.png',
        }
      }
    })
    ];
    console.log(infos);
    res.json(infos[3]);
  }
  catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.post('/challenge', async (req,res,next) => {
  try {
    let from = {_id: req.query.user};
    let to = {_id: req.query.to};
    let update = await db.users.findOneAndUpdate({...to,online: true},{
      $push: {
        'news.challenges': from
      }
    })
    if (!update) {
      res.status(400).send('not online');
    } else {
      res.sendStatus(200);
    }
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})



function getUniByEmail(email) {
  let regex = /[a-z]+\.[a-z]+$/i;
  let domain = email.match(regex)[0];
  return db.unis.findOne({domains:domain},['name','alpha_two_code']);
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
