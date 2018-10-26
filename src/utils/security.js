import db from './db'
import bcrypt from 'bcrypt'


const NO_CHECK_TOKEN = [
  '/users/register',
  '/users/login',
]

const CHECK_TEAM_ADMIN = [
  '/invite',
  '/challenge',
  '/accept-challenge',
]

export async function checkAccessToken(req,res,next) {
  return next();
  if (NO_CHECK_TOKEN.indexOf(req.path) < 0) {
    try {
      let query = req.get('user');
      let token = req.get('Authorization');
      let doc = await db.users.findOne(query,'private.access_token');
      if (!doc) {
        res.sendStatus(404);
        return;
      }
      let right = await bcrypt.compare(token, doc.private.access_token);
      if (right) next()
      else {
        res.sendStatus(401);
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

export async function checkTeamAdmin(req, res, next) {
  if (CHECK_TEAM_ADMIN.indexOf(req.path) >= 0) {
    try {
      console.log('Check team admin')
      let user_id = req.get('user');
      let team_id = req.query.team;
      let team = await db.teams.findOne(team_id);
      if (team.admins.indexOf(user_id) >= 0) {
        next();
      } else {
        res.sendStatus(401)
      }
    } catch (err) {
      console.log(err);
      res.sendStatus(500);
    }
  } else {
    next();
  }
}
