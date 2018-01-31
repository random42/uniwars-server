const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const users = db.get("users");
const unis = db.get("unis");
const sharp = require('sharp');
const pictureSize = {
  small: 50,
  medium: 256,
  large: 500
}

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



router.post('/register', function(req, res, next) {
  let user = req.body;

  if (checkRegisterForm(user)) {
    users.findOne({email:user.email}).then(doc => {
      if (doc) {
        res.status(400).send('Account already exists');
      }else {
        getUniByEmail(user.email).then(uni => {
          if (uni === null) {
            res.status(400).send('Invalid email domain');
          } else {
            user.country = uni.country;
            user.uni = {_id: uni._id,name: uni.name};
            bcrypt.hash(user.password,saltRounds,function(err, hash) {
              if (err) console.log(err)
              else {
                user.name = user.first_name+' '+user.last_name;
                user.password = hash;
                users.insert(user).then(doc => {
                  console.log(doc);
                  console.log('New account registered!');
                  res.send('OK');
                }).catch(err => console.log(err))
              }
            });
          }
        })
      }
    })

  } else {
    res.status(500).send('Invalid form!');
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

  let fields = ['first_name','last_name','email','password','major']
  let maxLength = {
    first_name: 1024,
    last_name: 1024,
    email: 254,
    password: 255,
    major: 255
  }
  let regex = {
    first_name : /^[a-z]+(\s+[a-z]+)*$/i,
    last_name : /^[a-z]+(\s+[a-z]+)*$/i,
    email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
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
