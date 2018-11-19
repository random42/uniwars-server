let credentials = {};
let accounts = [{
  username: 'random',
  email: 'roberto.sero@edu.unito.it',
  password: 'QWEpoi123',
},{
  username: 'shorty',
  email: 'asd.asd@polito.it',
  password: 'QWEpoi123',
}]
const rl = require('readline-sync');
const Api = require('../api/api-functions');
let store = require('../api/store');

async function sleep(ms) {
  return new Promise(res => setTimeout(res,ms))
}

async function run() {
  try {
    credentials.username = rl.question('Login\nusername: ');
    credentials.password = rl.question('password: ',{hideEchoBack: true});
    store.user = await Api.users.login(credentials);
    console.log('Logged in successfully!');
    await Api.socket.connect();
    console.log('Socket auth');
    Api.game.search('solo');
  } catch(err) {
    console.log(err)
  }
}



run()
