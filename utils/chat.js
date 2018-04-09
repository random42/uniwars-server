const db = require('../db');
const monk = require('monk');
const bcrypt = require('bcrypt');
const io = require('./io').io;
const connections = require('./io').connections;
const chat = io.of('/chat');

chat.on('connection', async function(socket) {
  try {
    let auth = await socket.auth;
    if (!auth) {
      console.log(auth);
      return;
    }
    console.log('chat conn')
    // joining chats
    let user = await db.users.findOne(socket.user_id,'private');
    if (user.private.chats) {
      let rooms = user.private.chats.map((chat) => chat.toString());
      console.log(rooms);
      rooms.forEach((room) => {
        socket.join(room);
      })
    }
  } catch (err) {
    console.log(err);
    socket.disconnect(true);
  }
})

async function message(msg) {

}


module.exports = chat;
