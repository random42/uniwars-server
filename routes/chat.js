const express = require('express');
const router = express.Router();
const db = require('../db');
const monk = require('monk');
const chat_io = require('../utils/chat');
const io_connections = require('../utils/io').connections;

router.post('/create-group', async function(req,res,next) {
  try {
    let user = req.get('user');
    let user_oid = monk.id(user);
    let check_partecipants = await areFriends(user,req.query.partecipants)
    if (!check_partecipants) {
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
    chat.partecipants = req.query.partecipants.map((id) => monk.id(id));
    chat.partecipants.push(user_oid);
    chat.admins = [user_oid];
    // adding users to socket room
    joinRoom(chat._id.toString(),chat.partecipants.map(a => a.toString()));
    // updating database
    let operations = [db.users.update({
      _id: {$in: chat.partecipants}
      },{
      $push: {
        'private.chats': chat._id
      }
    }),db.chats.insert(chat)];
    await Promise.all(operations);
    res.sendStatus(200);
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
      partecipants: {$all: [user,partner]}
    },'_id');
    if (exists) {
      console.log('exists',exists);
      res.sendStatus(400);
      return;
    }
    // creating chat object
    let chat = {};
    chat._id = monk.id();
    chat.collection = "users";
    chat.type = "duo";
    chat.partecipants = [monk.id(user),monk.id(partner)];
    // adding users to socket room
    joinRoom(chat._id.toString(),chat.partecipants.map(a => a.toString()));
    // updating database
    let operations = [db.users.update({
      _id: {$in: chat.partecipants}
      },{
      $push: {
        'private.chats': chat._id
      }
    }),db.chats.insert(chat)];
    await Promise.all(operations);
    res.sendStatus(200);
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
    let messages = await db.chats.aggregate([
      {
        $match: {_id: chat}
      },
      {
        $project: {
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
    
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

router.put('/add-users', async function(req,res,next) {
  try {
    let user_id = req.get('user');
    let chat_id = req.query.chat;
    let invited = req.query.invited;
    let allowed = await checkPermissions(user_id,chat_id,invited,{
      types: ['group'],
      collections: ['users'],
      admin: true,
      friends: true,
      not_partecipants: true,
    });
    if (!allowed) {
      res.sendStatus(400);
    } else {
      await db.chats.findOneAndUpdate(chat_id,{
        $push: {
          partecipants: {$each: invited.map(user => monk.id(user))}
        }
      });
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
      partecipants: true,
    });
    if (!allowed) {
      res.sendStatus(400);
    } else {
      await db.chats.findOneAndUpdate(chat,{
        $pull: {
          partecipants: {
            $in: removed
          },
          admins: {
            $in: removed
          }
        }
      });
      leaveRoom(chat,removed);
    }
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})


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
    let socket = io_connections[user];
    if (socket) {
      socket.leave(chat);
    }
  })
}

function joinRoom(chat,users) {
  users.forEach((user) => {
    let socket = io_connections[user];
    if (socket) {
      socket.join(chat);
    }
  })
}

async function checkPermissions(user_id,chat_id,users,{types, collections, admin, friends, not_partecipants, partecipants}) {
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
  if (not_partecipants) {
    for (let i in users) {
      if (chat.partecipants.indexOf(users[i]) >= 0) {
        return false;
      }
    }
  }
  if (partecipants) {
    for (let i in users) {
      if (chat.partecipants.indexOf(users[i]) < 0) {
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
