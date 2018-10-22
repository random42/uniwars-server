const { CHAT_MAX_MSG_LENGTH } = require('../utils/constants');
const db = require('../utils/db');
const monk = require('monk');
const Utils = require('../utils')
const debug = require('debug')('socket:chat');
const { server } = require('./index');

let nsp = server.of('/chat');

nsp.postAuthenticate = postAuthenticate

async function postAuthenticate(socket) {
  // joining chats
  let doc = await db.users.findOne(socket.user_id,'private.chats');
  doc = Utils.stringifyIds(doc);
  let chats = doc.private.chats;
  for (let i in chats) {
    socket.join(chats[i]);
  }
  // EVENT HANDLERS
  socket.on('message', (msg, chat, cb) => {
    if (!checkMessage(msg) || !(chat in socket.rooms))
      return // TODO HACK
    // inserts ids
    let _id = monk.id();
    msg._id = _id.toString();
    msg.user = socket.user_id;
    debug(msg);
    // returns the message with the generated _id
    cb(msg);
    // emits message
    socket.in(chat).emit('message',msg,chat);
    // update database
    insertMsg(msg,chat,_id);
  });


}

function checkMessage(msg) {
  const model = {
    user: 'string',
    created_at: 'number',
    text: 'string'
  }
  if (typeof(msg) !== 'object') return false
  for (let i in msg) {
    if (!(i in model)) return false
    if (typeof(msg[i]) !== model[i]) return false
  }
  return msg.created_at <= Date.now() && // timestamp validity
    msg.text.length < MAX_MSG_LENGTH; // text length
}

async function insertMsg(msg,chat,_id) {
  try {
    msg._id = _id;
    msg.user = monk.id(msg.user);
    let update = await db.chats.findOneAndUpdate(chat,{
      $push: {
        messages: msg
      }
    },{projection: ['_id']});
    //debug('saving message',update);
  } catch (err) {
    debug(err.message);
  }
}
