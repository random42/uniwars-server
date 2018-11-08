// @flow
import passport from 'passport'
import express from 'express'
const { HTTP, PROJECTIONS } = require('../../api/api')
import { DB } from '../db'
const debug = require('debug')('http:auth')
import { socket } from '../socket'
import { sharp } from 'sharp'
import { debugRequest } from './utils'
import monk from 'monk'

export const router = express.Router()

router.get('/google',
  passport.authenticate('google', { scope: ['email','profile'] })
)


router.use('/google/callback',
  debugRequest,
  passport.authenticate('google'),
  function(req,res,next) {
    debug(req.user)
    res.sendStatus(200)
  }
)
