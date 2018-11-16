// @flow
import uuid from 'uuid/v4'
import type { ID } from '../types'
import { DB, dbOptions } from '../db'
import crypto from './crypto'
const TOKEN_SALT : number = 3


/**
 * Generates and stores token in user's document.
 *
 * @return Token
 */
export async function genAndStoreToken(user: ID): Promise<string>{
  const token = uuid()
  const hash = await crypto.hash(token, TOKEN_SALT)
  const update = await DB.get('users').findOneAndUpdate(user, {
    $set: {
      'private.access_token': hash
    }
  }, dbOptions(['NO_PROJ']))
  return token
}

export async function checkToken(user: ID, token : string) : Promise<boolean> {
  if (!user || !token) return false
  const doc = await DB.get("users").findOne(user, {
    projection: { 'private.access_token': 1}
  })
  const hash = doc.private.access_token
  if (!hash)
    return false
  else
    return crypto.compare(token, hash)
}

/**
 * Authorize request by checking user's _id in 'User' header and token
 * in 'Authorization' header. Sets req.user field on success.
 *
 * @return Status 401 if not authorized.
 */
export async function authorizeUserMiddleware(req : Object, res : Object, next : () => any) {
  const token = req.get("Authorization")
  const user = req.get("User")
  const right = await checkToken(user, token)
  if (right) {
    req.user = user
    next()
  }
  else
    // Unauthorized
    res.sendStatus(401)
}
