const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const monk = require('monk');
const nsp = require('../socket').chat;
const _ = require('lodash/core')
const crud = require('../crud')
const { GROUP_CHAT_MAX_MEMBERS } = require('../utils/constants')

// TODO put regex in constants

router.post('/create-group', async function(req,res,next) {
  const user = req.get('user')
  let { name, participants } = req.query
  let check =
    name && participants
    && participants instanceof Array
    && participants.length > 0 && participants.length < GROUP_CHAT_MAX_MEMBERS -1
  check = check && await checkPermissions({
    user_id: user,
    users: participants,
    friends: true
  })
  if (!check) return res.sendStatus(400)
  participants = participants.map((u) => {
    return {_id: u}
  })
  participants.push({_id: user, admin: true})
  const chat = await crud.chat.createChat({
    name,
    participants,
    collection: "users",
    type: "group",
  })
  res.json(chat);
  joinRoom(chat._id.toString(), participants.map(u => u._id))
})

router.post('/create-private', async function(req,res,next) {
  const user = req.get('user')
  const { partner } = req.query
  if (!partner) return res.sendStatus(400)
  // checking if chat exists
  let exists = await db.chats.findOne({
    type: "duo",
    participants: {$all: [user,partner]}
  },{projection: ['_id']});
  if (exists) {
    return res.sendStatus(400)
  }
  let check = await checkPermissions({
    user_id: user,
    users: [partner],
    friends: true
  })
  if (!check) return res.sendStatus(400)
  const chat = await crud.chat.createChat({
    type: "duo",
    name: null,
    collection: "users",
    participants: [{_id: user},{_id: partner}]
  })
  res.json(chat)
  joinRoom(chat._id.toString(), [user,partner])
})

router.put('/messages', async function(req,res,next) {
  let { time } = req.query
  const user = req.get('user');
  if (!time) return res.sendStatus(400)
  time = parseInt(time)
  if (isNaN(time)) return res.sendStatus(400)
  const chats = await crud.chat.upToDateChats({user, time})
  res.json(chats)
})

router.put('/leave-group', async function(req,res,next) {
  let user = req.get('user');
  let {chat} = req.query;
  if (!chat) return res.sendStatus(400)
  await crud.chat.removeUsers({users: [user],chat})
  res.sendStatus(200)
  leaveRoom(chat, [user])
})

router.put('/add-users', async function(req,res,next) {
  const user = req.get('user')
  let { chat, invited } = req.query
  if (!chat || !invited || !(invited instanceof Array))
    return res.sendStatus(400)
  let allowed = await checkPermissions({
    user_id: user,
    users: invited,
    types: ['group'],
    collections: ['users'],
    admin: true,
    friends: true,
    not_participants: true,
  });
  if (!allowed)
    return res.sendStatus(400);
  await crud.chat.addUsers({users: invited, chat})
  res.sendStatus(200)
  joinRoom(chat, invited)
})

router.put('/remove-users', async function(req,res,next) {
  const user = req.get('user');
  let { removed, chat } = req.query
  if (!chat || !removed || !(removed instanceof Array) || removed.length === 0)
    return res.sendStatus(400)
  let allowed = await checkPermissions({
    user_id: user,
    chat_id: chat,
    users: removed,
    types: ['group'],
    collections: ['users'],
    admin: true,
    participants: true,
  });
  if (!allowed) {
    res.sendStatus(400);
  } else {
    let op = await crud.chat.removeUsers({users: removed, chat})
    res.sendStatus(200)
    leaveRoom(chat,removed)
  }
})

function leaveRoom(chat,users) {
  users.forEach((user) => {
    let socket = nsp.connections.get(user);
    if (socket) {
      socket.leave(chat);
    }
  })
}

function joinRoom(chat,users) {
  users.forEach((user) => {
    let socket = nsp.connections.get(user);
    if (socket) {
      socket.join(chat);
    }
  })
}

async function checkPermissions({
  user_id,
  users = [],
  chat_id,
  types, // allowed chat types
  collections, // allowed chat collections
  admin, // user_id is admin
  friends, // user_id is friend with users
  not_participants, // users are not participants
  participants  // users are participants
  }) {

  let user, chat
  if (user_id)
    user = await db.users.findOne(user_id,['private.chats','friends'])
  if (chat_id) {
    chat = await db.chats.findOne(chat_id,'-messages')
    if (!chat) return false
  }
  if (types && types.indexOf(chat.type) < 0) return false;
  if (collections && collections.indexOf(chat.collection) < 0) return false;
  if (admin && !_.find(chat.participants, {
    _id: user_id,
    admin: true
  })) return false;
  if (friends) {
    for (let i in users) {
      if (user.friends.indexOf(users[i]) < 0) {
        return false;
      }
    }
  }
  if (not_participants) {
    for (let i in users) {
      if (chat.participants.indexOf(users[i]) >= 0) {
        return false;
      }
    }
  }
  else if (participants) {
    for (let i in users) {
      if (chat.participants.indexOf(users[i]) < 0) {
        return false;
      }
    }
  }
  return true;
}

function checkName(name) {
  return name.length < 64;
}

module.exports = router;
