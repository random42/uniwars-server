const express = require('express');
const router = express.Router();
const db = require('../db');
const monk = require('monk');
const chat_io = require('../utils/socket.io/chat');
const chat_io_connections = chat_io.connected;

router.post('/create-group', async function(req,res,next) {
  try {
    let user = req.get('user');
    let user_oid = monk.id(user);
    let participants = req.query.participants;
    let check_participants = await areFriends(user,participants)
    if (!check_participants) {
      res.sendStatus(400);
      return;
    }
    let chat = {};
    // creating chat object
    chat._id = monk.id();
    chat.collection = "users";
    chat.type = "group";
    chat.name = req.query.name;
    if (!checkName(chat.name)) {
      res.sendStatus(400);
      return;
    }
    chat.participants = participants.map((id) => monk.id(id));
    chat.participants.push(user_oid);
    chat.messages = [];
    chat.admins = [user_oid];
    // adding users to socket room
    joinRoom(chat._id.toString(),chat.participants.map(a => a.toString()));
    // updating database
    let operations = [db.users.update({
      _id: {$in: chat.participants}
      },{
      $push: {
        'private.chats': chat._id
      }
    },{projection: ['_id']}),db.chats.insert(chat)];
    await Promise.all(operations);
    res.json(chat);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.post('/create-private', async function(req,res,next) {
  try {
    let user = req.get('user');
    let partner = req.query.partner;
    // checking if chat exists
    let exists = await db.chats.findOne({
      participants: {$all: [user,partner]}
    },{projection: ['_id']});
    if (exists) {
      res.sendStatus(400);
      return;
    }
    // creating chat object
    let chat = {};
    chat._id = monk.id();
    chat.collection = "users";
    chat.type = "duo";
    chat.messages = [];
    chat.participants = [monk.id(user),monk.id(partner)];
    // adding users to socket room
    joinRoom(chat._id.toString(),chat.participants.map(a => a.toString()));
    // updating database
    let operations = [db.users.update({
      _id: {$in: chat.participants}
      },{
      $push: {
        'private.chats': chat._id
      }
    }),db.chats.insert(chat)];
    await Promise.all(operations);
    res.json(chat);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.put('/messages', async function(req,res,next) {
  try {
    let time = req.query.time; // timestamp of last message
    let chat = req.query.chat;
    let user = req.get('user');
    let allowed = await checkPermissions(user,chat,[user],{
      participants: true
    });
    if (!allowed) {
      res.sendStatus(400);
      return;
    }
    let messages = await db.chats.aggregate([
      {
        $match: {_id: chat}
      },
      {
        $project: { // filtering messages after queried timestamp
          messages: {
            $filter: {
              input: '$messages',
              as: 'msg',
              cond: {
                $gt: ['$$msg.created_at',time]
              }
            }
          }
        }
      },
      {
        $unwind: '$messages'
      },
      {
        $replaceRoot: {newRoot: '$messages'}
      }
    ]);
    console.log(messages);
    res.json(messages);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.put('/leave-group', async function(req,res,next) {
  try {
    let user = req.get('user');
    let {chat} = req.query;
    // no permissions check because if the user does not belong to chat nothing changes
    // removing user from chat participants and admins
    let update = await removeUsersFromChat(chat,[user]);
    if (!update) {
      res.sendStatus(400);
    }
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.put('/add-users', async function(req,res,next) {
  try {
    let user_id = req.get('user');
    let chat = req.query.chat;
    let invited = req.query.invited;
    let allowed = await checkPermissions(user_id,chat,invited,{
      types: ['group'],
      collections: ['users'],
      admin: true,
      friends: true,
      not_participants: true,
    });
    if (!allowed) {
      res.sendStatus(400);
    } else {
      let op = await addUsersToChat(chat,invited);
      if (!op) {
        res.sendStatus(400);
        return;
      }
      joinRoom(chat_id,invited);
      res.sendStatus(200);
    }
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.put('/remove-users', async function(req,res,next) {
  try {
    let user = req.get('user');
    let removed = req.query.removed;
    let chat = req.query.chat;
    let allowed = await checkPermissions(user,chat,removed,{
      types: ['group'],
      collections: ['users'],
      admin: true,
      participants: true,
    });
    if (!allowed) {
      res.sendStatus(400);
    } else {
      let op = await removeUsersFromChat(chat,removed);
      if (!op) {
        res.sendStatus(400);
        return;
      }
      leaveRoom(chat,removed);
      res.sendStatus(200);
    }
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

async function addUsersToChat(chat,users) {
  try {
    let ops = await Promise.all([
      // push chat in users chats
      db.users.update({
        _id: {$in: users}
      },{
        $push: {'private.chats': monk.id(chat)}
      },{projection: ['_id']}),
      // push users in chat's participants array
      db.chats.findOneAndUpdate(chat,{
        $push: {
          participants: {$each: users.map(user => monk.id(user))}
        }
      },{projection: ['_id']})
    ]);
    if (!ops || !ops[0] || !ops[1]) return false;
    // joining socket rooms
    joinRoom(chat,users);
    return true;
  } catch(err) {
    console.log(err);
    return false;
  }
}

async function removeUsersFromChat(chat,users) {
  try {
    let ops = await Promise.all([
      // pull chat from users' chats
      db.users.update({_id: {$in: users}},{
        $pull: {'private.chats': chat}
      },{projection: ['_id']}),
      // pull users from chat participants and admins
      db.chats.findOneAndUpdate(chat,{
        $pull: {
          participants: {$each: users},
          admins: {$each: users},
        }
      },{projection: ['_id','admins']})
    ]);
    if (!ops || !ops[0] || !ops[1]) return false;
    let chatDoc = ops[1];
    // if there are no admins left all participants become admins
    if (chatDoc.admins.length === 0) {
      db.chats.findOneAndUpdate(chat,{
        $push: {
          admins: {$each: '$participants'}
        }
      },{projection: ['_id']})
    }
    leaveRoom(chat,users);
    return true;
  } catch(err) {
    console.log(err);
    return false;
  }
}

async function areFriends(user,arr) {
  let doc = db.users.findOne(user,'friends');
  if (arr.length > friends.length) return false;
  for (let i in arr) {
    if (doc.friends.indexOf(arr[i]) < 0) {
      return false;
    }
  }
  return true;
}

function leaveRoom(chat,users) {
  users.forEach((user) => {
    let socket = chat_io_connections[user];
    if (socket) {
      socket.leave(chat);
    }
  })
}

function joinRoom(chat,users) {
  users.forEach((user) => {
    let socket = chat_io_connections[user];
    if (socket) {
      socket.join(chat);
    }
  })
}

async function checkPermissions(user_id,chat_id,users,{
  types, // allowed chat types
  collections, // allowed chat collections
  admin, // user_id is admin
  friends, // user_id is friend with users
  not_participants, // users are not participants
  participants  // users are participants
  }) {
  let get = await Promise.all([db.chats.findOne(chat,'-messages'),
    db.users.findOne(user,['private','friends'])
  ]);
  let chat = get[0];
  let user = get[1];
  if (types && types.indexOf(chat.type) < 0) return false;
  if (collections && collections.indexOf(chat.collection) < 0) return false;
  if (admin && chat.admins.indexOf(user_id) < 0) return false;
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
  if (participants) {
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
