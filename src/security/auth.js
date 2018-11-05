// @flow

import { User } from '../models'
import { db } from '../utils'
import bcrypt from 'bcrypt'
import passport from 'passport'

/**
 *
 * @param user  Username or email
 * @param password
 * @param done Verify function
 */
export async function login(
  user : string,
  password : string
  ) : Promise<User>{
  const doc = await db.users.findOne({
    $or : [
      {
        email: user
      },{
        username: user
      }
    ]
  })
  if (!doc || !doc.private.password) return Promise.reject("Invalid user.")
  const right : boolean = await bcrypt.compare(password, doc.private.password)
  if (!right) return Promise.reject("Invalid password.")
  return new User(doc)
}