const { solo, squad } = require('../server/utils/matchmaking');
let users = require('../data/users_100.json');

async function pushEm(users) {
  for (let i in users) {
    squad.push(users[i]._id);
    await sleep(500);
  }
}

async function sleep(ms) {
  return new Promise(res => {
    setTimeout(res,ms);
  })
}

pushEm(users)
