// @flow

import passport from 'passport'
const debug = require('debug')('security:oauth')
const OAUTH = require('../../secret/oauth.json')
import { db } from '../utils'
import { User } from '../models'
import {OAuth2Strategy as GoogleStrategy} from 'passport-google-oauth'



/**
 * Finds user given the external profile
 */
export async function findUser(profile : Object) : Promise<User> {
  const doc = await db.get('users').findOne({
    "private.oauth": {
      $elemMatch: {
        id: profile.id,
        provider: profile.provider,
      }
    }
  })
  if (doc) return new User(doc)
  else return Promise.reject("Not found.")
}



/**
 * Log in if user exists.
 */
export async function handleAuth() {
  // TODO
}


/**
 * Google
 */
const google = new GoogleStrategy(
  // Use the API access settings stored in ./config/auth.json. You must create
  // an OAuth 2 client ID and secret at: https://console.developers.google.com
  {
    ...OAUTH.google.web,
    callbackURL : '/auth/google/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    handleAuth()
    return done(null, profile)
  }
)


passport.use(google)
