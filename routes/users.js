const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const users = db.get("users");
const unis = db.get("unis");
const sharp = require('sharp');
const monk = require('monk');
const pictureSize = {
  small: 50,
  medium: 256,
  large: 500
}
const httpStatus = require('../constants');
const majors = require('../data/majors.json');
const PhoneNumber = require('awesome-phonenumber');

// see https://github.com/kelektiv/node.bcrypt.js
const saltRounds = 12;

router.get('/login', async function(req, res, next) {
  // TODO maybe set online offline user in db
  let form = req.body;
  console.log('form',form);
  let key = form.email ? 'email' : 'username';
  let query = {};
  query[key] = form[key];
  let doc = await users.findOne(query);
  if (doc) {
    // check password
    let done = await bcrypt.compare(form.password,doc.private.password)
    if (done) {
      // password correct
      // generate client token
      let token = monk.id();
      users.findOneAndUpdate(query,{...doc,private: {token},online: true}).then((doc) => {
        console.log('updated',doc);
        res.json(doc);
      });
    }
    else {
      res.status(httpStatus.LOGIN_PASSWORD); // wrong password
    }
  }
  else {
    res.status(httpStatus.LOGIN_USERNAME); // wrong username or email
  }
});

router.get('/login-username', function(req, res, next) {
  // TODO maybe set online offline user in db
  let user = req.body;
  users.findOne({username:user.username}).then(doc => {
    if (doc) {
      bcrypt.compare(user.password,doc.password,function(err,done) {
        if (done) {
          res.send(doc);
        }
        else {
          res.send('wrong pass');
        }
      })
    }
    else {
      res.send('wrong email');
    }
  })
});

router.get('/uni-by-email',function (req,res,next) {
  let email = req.query.email;
  getUniByEmail(email).then(doc => {
    console.log(doc);
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
  let id = req.query.id;
  let size = pictureSize[req.query.size];
  console.log(size);
  if (!id) {
    res.statusSend(406);
  }
  sharp('./public/images/profile_pictures/'+size+'x'+size+'/'+id+'.png')
  .toBuffer().then((data) => {
    console.log(data);
    res.send(data);
  }).catch(err => {
    console.log(err);
    res.sendStatus(404);
  })
});

router.put('/facebook-login',function (req, res, next) {
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

router.put('/add-email', function (req,res,next) {
  let user = req.body;
  users.findOneAndUpdate({facebook_id:user.id},{email:user.email})
  .then(doc => {
    console.log(doc);
  })
});


router.post('/register', async function(req, res, next) {
  let user = req.body;
  let email = user.email;
  console.log(user);
  if (!checkRegisterForm(user)) {
    res.sendStatus(httpStatus.REGISTER_INVALID_FORM);
    return;
  }
  let uni = await getUniByEmail(user.email);
  if (!uni) {
    res.status(httpStatus.REGISTER_INVALID_EMAIL).send('Invalid email domain');
  }
  let doc = await users.findOne({email});
  if (doc) {
    res.status(httpStatus.REGISTER_EXIST).send('Account already exists');
  }
  let existUsername = await users.findOne({username: user.username});
  if (existUsername) {
    res.status(httpStatus.REGISTER_INVALID_USERNAME).send('Username is already used.');
  }
  else {
    user.country = uni.country;
    user.uni = {_id: uni._id,name: uni.name};
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
      console.log(doc);
      console.log('New account registered!');
      res.sendStatus(200);
    }).catch(err => console.log(err))
  }
});

router.post('/set-picture', function(req,res,next) {
  // set headers Content-Type to application/octet-stream
  let picture = req.body;
  let id = req.query.id;
  if (!id || !picture) {
    res.sendStatus(403);
  }
  sharp(picture).resize(pictureSize.large,pictureSize.large).toFile('./public/images/profile_pictures/500x500/'+id+'.png');
  sharp(picture).resize(pictureSize.medium,pictureSize.medium).toFile('./public/images/profile_pictures/256x256/'+id+'.png');
  sharp(picture).resize(pictureSize.small,pictureSize.small).toFile('./public/images/profile_pictures/50x50/'+id+'.png').then((info) => {
    console.log('Set picture of user_id',id);
    res.sendStatus(200);
  }).catch(err => {
    res.sendStatus(500);
  })
})


function getUniByEmail(email) {
  let regex = /[a-z]+\.[a-z]+$/i;
  let domain = email.match(regex)[0];
  return unis.findOne({domains:domain},'-messages');
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
