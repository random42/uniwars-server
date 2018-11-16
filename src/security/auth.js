// @flow

import { User } from '../models'
import { DB } from '../db'
import passport from 'passport'
import crypto from './crypto'


/**
 * @param user  Username or email
 * @param password
 */
export async function localLogin(
  user : string,
  password : string
  ) : Promise<User> {
  const doc = await DB.get('users').findOne({
    $or : [
      {
        email: user
      },{
        username: user
      }
    ]
  })
  if (!doc || !doc.password) return Promise.reject("Invalid user")
  const right : boolean = await crypto.compare(password, doc.password)
  if (!right) return Promise.reject("Invalid password")
  return new User(doc)
}
