const MAX_MSG_LENGTH = 1024;
const db = require('../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const io = require('./io');
let chat = io.of('/chat');
chat.connections = {}; // sockets indexed by user_id
chat.postAuthenticate = postAuthenticate;
/*
  msg : {
    chat: '_id',
    text: '',
    created_at: 12344,
  }
*/

chat.on('connection', postAuthenticate);

// chat namespace post authenticate fn
async function postAuthenticate(socket) {
  // joining rooms
  let user = await db.users.findOne(socket.user_id,'private');
  let chats = user.private.chats;
  for (let i in chats) {
    socket.join(chats[i]);
  }
  // EVENT HANDLERS
  socket.on('message', (msg, chat, cb) => {
    if (!checkMessage(msg) || !(chat in socket.rooms)) return cb(false) // TODO HACK
    // inserts ids
    msg._id = monk.id().toString();
    msg.user = socket.user_id;
    cb(msg);
    // emits message
    socket.in(chat).emit('message',msg, chat);
    // update database
    insertMsg(msg);
  });
}

function checkMessage(msg) {
  return msg && msg.created_at && msg.text &&
  typeof(msg.text) === 'string' &&
  typeof(msg.created_at) === 'number' &&
  msg.created_at <= Date.now() && // timestamp validity
  msg.text.length < MAX_MSG_LENGTH; // text length
}

async function insertMsg(msg,chat) {
  try {
    msg._id = monk.id(msg._id);
    msg.user = monk.id(msg.user);
    let update = await db.chats.findOneAndUpdate(chat,{
      $push: {
        messages: msg
      }
    },{projection: ['_id']});
    console.log('saving message',update);
  } catch (err) {
    console.log(err);
  }

}

module.exports = chat;
