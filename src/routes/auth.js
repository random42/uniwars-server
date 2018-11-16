// @flow
import passport from 'passport'
import express from 'express'
const { HTTP, PROJECTIONS } = require('../../api/api')
import { DB } from '../db'
const debug = require('debug')('http:auth')
import { crypto, localLogin, genAndStoreToken } from '../security'
import { debugRequest } from './utils'
import monk from 'monk'

export const router = express.Router()

router.post('/register', async (req, res, next) => {
  const data = req.body
  const { password } = data
  data.password = await crypto.hash(password)
  await User.create(data)
})

router.post('/login', async (req, res, next) => {
  const { user, password } = req.data
  const u = await localLogin(user, password)
  if (u) {
    const token = await genAndStoreToken(u._id)
    res.json({ user: u, token })
  }
  else
    res.sendStatus(400)
})

// router.get('/google',
//   passport.authenticate('google', { scope: ['email','profile'] })
// )
//
//
// router.use('/google/callback',
//   debugRequest,
//   passport.authenticate('google'),
//   function(req,res,next) {
//     debug(req.user)
//     res.sendStatus(200)
//   }
// )
