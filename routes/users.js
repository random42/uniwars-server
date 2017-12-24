var express = require('express');
var router = express.Router();
const db = require('../db')
const bcrypt = require('bcrypt');
const users = db.get("users");

// see https://github.com/kelektiv/node.bcrypt.js
const saltRounds = 12;


router.get('/login', function(req, res, next) {
  // TODO maybe set online offline user in db
  let user = req.body;
  users.findOne({email:user.email}).then(doc => {
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

// FACEBOOK

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

router.get('/uni-by-email',function (req,res,next) {
  let domain = getDomain(req.body.email);
  var unis = db.get("unis");
  unis.findOne({domains:domain},['name','country'])
  .then(doc => {
    console.log(doc);
    res.send(doc);
  })
})

router.post('/register', function(req, res, next) {
  let user = req.body;
  if (checkRegisterForm(user)) {
    bcrypt.hash(user.password,saltRounds,function(err, hash) {
      if (err) console.log(err)
      else {
        user.name = user.first_name+' '+user.last_name;
        user.password = hash;
        users.insert(user).then(doc => {
          console.log('New account registered!');
          res.send();
        }).catch(err => console.log(err))
      }
    });
  }
  else {
    res.status(500).send('Invalid form!');
  }
});

function getDomain(email) {
  let regex = /[a-z]+\.[a-z]+$/i;
  return email.match(regex)[0];
}

function checkRegisterForm(user) {

  // password must have a,A,1 8-255 chars

  let fields = ['first_name','last_name','email','uni','password','major']
  let maxLength = {
    first_name: 1024,
    last_name: 1024,
    email: 254,
    uni: 1024,
    password: 255,
    major: 255
  }
  let regex = {
    first_name : /^[a-z]+(\s+[a-z]+)*$/i,
    last_name : /^[a-z]+(\s+[a-z]+)*$/i,
    email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    uni: /^[a-z]+(\s+[a-z]+)*$/i,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,255}$/g,
    major: /^[a-z]+(\s+[a-z]+)*$/i
  }
  let valid = true;
  for (let i of fields) {
    if (!(user[i].length <= maxLength[i] && regex[i].test(user[i]))) {
      valid = false;
    }
  }
  return valid;
}

module.exports = router;
