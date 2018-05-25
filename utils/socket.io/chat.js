const MAX_MSG_LENGTH = 1024;
const db = require('../../db');
const monk = require('monk');
const Utils = require('../utils')
const bcrypt = require('bcrypt');
const debug = require('debug')('socket:chat');
const io = require('./io');
const socketUtils = require('./utils');

let nsp = io.of('/chat');

nsp.connections = new Map()

/*
  msg : {
    chat: '_id',
    text: '',
    created_at: 12344,
  }
*/


nsp.on('connect', (socket) => {
  // auth
  if (!(socketUtils.nspAuth({socket, nsp, io}))) {
    socket.disconnect();
    return
  }
  // adding socket to connections
  nsp.connections.set(socket.user_id, socket);
  // post
  postAuthenticate(socket);
})

// chat nsp post authenticate fn
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
    cb(msg);
    // emits message
    socket.in(chat).emit('message',msg,chat);
    // update database
    insertMsg(msg,chat,_id);
  });


}

function checkMessage(msg) {
  return msg && msg.created_at && msg.text &&
  typeof(msg.text) === 'string' &&
  typeof(msg.created_at) === 'number' &&
  msg.created_at <= Date.now() && // timestamp validity
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

module.exports = nsp;
