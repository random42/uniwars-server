const db = require('./db');
const bcrypt = require('bcrypt');


const NO_CHECK_LOGIN = [
  '/users/register',
  '/users/login',
]

const NO_CHECK_TEAM = [
  '/create',
]

async function checkLoginToken(req,res,next) {
  //next();
  if (req.method !== 'GET' && NO_CHECK_LOGIN.indexOf(req.path) < 0) {
    try {
      let query = {_id: req.get('user')};
      let token = req.get('login_token');
      let doc = await db.users.findOne(query,'private');
      if (!doc) {
        res.status(400).send('wrong id');
        return;
      }
      let right = await bcrypt.compare(token,doc.private.login_token);
      if (right) next()
      else {
        res.status(400).send('wrong token');
        return;
      }
    } catch (err) {
      console.log(err);
      res.statusSend(500);
    }
  } else {
    next();
  }
}

async function checkTeamAdmin(req,res,next) {
  console.log(req.path)
  if (req.method !== 'GET' && NO_CHECK_TEAM.indexOf(req.path) < 0) {
    try {
      console.log('Check team admin')
      let user_id = req.get('user');
      let team_id = req.query.team;
      let team = await db.teams.findOne(team_id);
      if (team.admins.indexOf(user_id) >= 0) {
        next();
      } else {
        res.status(400).send('not team admin');
        return;
      }
    } catch (err) {
      console.log(err);
      res.sendStatus(500);
    }
  } else {
    next();
  }
}

module.exports = {
  checkLoginToken,
  checkTeamAdmin
};
