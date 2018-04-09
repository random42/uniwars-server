const db = require('../db');
const bcrypt = require('bcrypt');
const io = require('socket.io')({
  serveClient: false,
});
let connections = {};

io.on('connection', async function(socket) {
  try {
    console.log('connected socket',socket.id);
    // checking token
    let _id = socket.handshake.query._id;
    let token = socket.handshake.query.login_token;
    let auth = checkToken();
    socket.auth = auth;
    let logged = await auth;
    if (!logged) {
      socket.disconnect(true);
      return;
    }
    // adding socket to connected users
    socket.user_id = _id;
    connections[_id] = socket;
    console.log(Object.keys(connections).length);
  } catch (err) {
    console.log(err);
    socket.disconnect(true);
  }
})

io.on('disconnect', async function(socket) {
  delete connections[socket.user_id];
})


module.exports = {io,connections};



async function checkToken(_id,token) {
  return new Promise((res) => {
    setTimeout(res,1000,true);
  });
  try {
    let user = await db.users.findOne(_id,'private');
    console.log(user);
    let right = await bcrypt.compare(token,user.private.login_token);
    return right;
  } catch(err) {
    console.log(err);
    return false;
  }
}
