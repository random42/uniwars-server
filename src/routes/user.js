import express from 'express'
export const router = express.Router()
import { user as C } from '../controllers'

router.get('/', C.getUser)

router.get('/search', C.search)

// TODO
router.delete('/',async function(req,res,next) {
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
  let user = await DB.get('users').findOne(_id, 'picture');
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
    DB.get('users').findOneAndUpdate(_id,{
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
  await DB.get('users').findOneAndUpdate(to, {
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
  let update = await DB.get('users').findOneAndUpdate({
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
    DB.get('users').findOneAndUpdate(user, {
      $addToSet: {
        'friends': to
      }
    }),
    DB.get('users').findOneAndUpdate(to, {
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
  return DB.get('unis').findOne({domains:domain},['_id']);
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
