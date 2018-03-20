const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const users = db.get("users");
const unis = db.get("unis");
const sharp = require('sharp');
const monk = require('monk');
const picSize = {
  small: 50,
  medium: 256,
  large: 500
}
const majors = require('../data/majors.json');
const PhoneNumber = require('awesome-phonenumber');
const extern_login = ['facebook.com','google.com'];
// see https://github.com/kelektiv/node.bcrypt.js
const saltRounds = 12;

async function checkLoginToken(query,loginToken) {
  //return true;
  try {
    let doc = await users.findOne(query,'private');
    let right = await bcrypt.compare(loginToken,doc.private.loginToken);
    return right;
  } catch (err) {
    console.log(err);
    return false;
  }
}

router.put('/login', async function(req, res, next) {
  try {
    // TODO maybe set online offline user in db
    let body = req.body;
    let query = req.query;
    let doc = await users.findOne(query);
    if (doc) {
      if (doc.online) {
        res.status(400).send('Already logged in');
        return;
      }
      // check password
      let done = await bcrypt.compare(body.password,doc.private.password)
      if (done) {
        // password correct
        // generate client loginToken
        let loginToken = monk.id().toString();
        // hash loginToken
        let hash = await bcrypt.hash(loginToken,saltRounds);
        let updatedDoc = await users.findOneAndUpdate(query,{
          $set: {
            'private.loginToken': hash,
            online: true,
          },
        });
        res.json([doc,loginToken]);
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
    let query = req.query;
    let loginToken = req.body.loginToken;
    let doc = await users.findOne(query,['private','online']);
    if (doc.online) {
      let rightToken = await bcrypt.compare(loginToken,doc.private.loginToken);
      if (rightToken) {
        let doc = await users.findOneAndUpdate(query,{
          $inc: { online_time: (Date.now() - monk.id(loginToken).getTimestamp())},
          $set: {
            online: false,
            'private.loginToken': null,
          }
          });
        res.sendStatus(200);
      } else {
        res.status(400).send('wrong loginToken');
      }
    } else {
      res.status(400).send('not online');
    }
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.get('/uni-by-email',function (req,res,next) {
  let email = req.query.email;
  getUniByEmail(email).then(doc => {
    res.send(doc);
  }).catch(err => {
    res.sendStatus(500);
  })
})

router.get('/profile',function (req,res,next) {
  let id = req.query.id;
  if (!id) {
    res.sendStatus(404);
  }
  users.findOne({_id: id},['-password']).then(doc => {
    res.send(doc);
  })
});

router.get('/picture',function (req,res,next) {
  let id = req.query._id;
  let size = picSize[req.query.size];
  if (!id) {
    res.sendStatus(406);
  }
  res.redirect('/images/profile_pictures/'+size+'x'+size+'/'+id+'.png');
});

router.post('/google-login',function (req, res, next) {
  let user = req.body;
  let id = user.id;
  users.findOne({facebook_id: id}).then((doc) => {
    if (doc) {
      // user exists
      res.send(doc);
    }
    else {
      // new user
      users.insert({
        facebook_id: user.id,
        name: user.name,
        first_name: user.first_name,
        last_name: user.last_name,
        gender: user.gender,
        age: user.age_range,
        picture: user.picture,
        timezone: user.timezone
      });
    }
  })
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
    let existEmail = await users.findOne({email});
    if (existEmail) {
      res.status(400).send('Account already exists');
      return;
    }
    let existUsername = await users.findOne({username: user.username});
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
      users.insert(user).then(doc => {
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
    let doc = await users.findOne(query,'private');
    if (!doc) {
      res.status(400).send('wrong query');
    }
    let checks = [await (bcrypt.compare(body.password,doc.private.password)),
      await (bcrypt.compare(body.loginToken,doc.private.loginToken))];
    if (checks[0] && checks[1]) {
      let deleted = await users.findOneAndDelete(query);
      console.log(deleted);
      res.sendStatus(200);
    } else {
      res.status(400).send('wrong loginToken or password');
    }
  } catch (err) {
    console.log(err);
    res.statusSend(500);
  }
})

router.post('/picture', async function(req,res,next) {
  // set headers Content-Type to application/octet-stream
  try {
    let query = req.query;
    let loginToken = req.get('loginToken');
    let rightToken = await checkLoginToken(query,loginToken);
    if (!rightToken) {
      res.status(400).send('wrong loginToken');
      return;
    }
    let picture = req.body;
    let _id = req.query._id;
    let infos = [
    await (sharp(picture)
    .resize(picSize.large,picSize.large)
    .toFile('./public/images/profile_pictures/500x500/'+_id+'.png')),
    await (sharp(picture).resize(picSize.medium,picSize.medium).toFile('./public/images/profile_pictures/256x256/'+_id+'.png')),
    await (sharp(picture).resize(picSize.small,picSize.small).toFile('./public/images/profile_pictures/50x50/'+_id+'.png'))];
    console.log(infos);
    res.sendStatus(200);
  }
  catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
})


function getUniByEmail(email) {
  let regex = /[a-z]+\.[a-z]+$/i;
  let domain = email.match(regex)[0];
  return unis.findOne({domains:domain},['name','alpha_two_code']);
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
