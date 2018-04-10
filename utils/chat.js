const db = require('../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const io = require('./io').io;
const connections = require('./io').connections;
const chat = io.of('/chat');
const MAX_MSG_LENGTH = 1024;

/*
  msg : {
    chat: '_id',
    text: '',
    created_at: 12344,
  }
*/

async function postAuthenticate(socket) {
  // joining rooms
  let user = await db.users.findOne(socket.user_id,'private');
  let chats = user.private.chats;
  for (let i in chats) {
    socket.join(chats[i]);
  }
  // middleware
  socket.use((packet,next) => {
    console.log(packet);
    return next();
  })
  // EVENT HANDLERS
  socket.on('message', (msg, cb) => {
    if (!checkMessage(msg) || !(msg.chat in socket.rooms)) return console.log('bad message'); // TODO HACK
    // tells client message got to the server
    cb(true);
    cb(false);
    let chat = msg.chat;
    // inserts ids
    msg._id = monk.id().toString();
    msg.user = socket.user_id;
    // emits message
    socket.in(chat).emit('message',msg, (ack) => {
      console.log(ack);
      // tells client message was received by TODO
    });
    // update database
    delete msg.chat;
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
    },'_id');
    console.log('saving message',update);
  } catch (err) {
    console.log(err);
  }

}

module.exports = postAuthenticate;
