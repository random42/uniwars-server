import passport from 'passport'


import { DB } from '../db'
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

import './oauth'

export default module.exports
