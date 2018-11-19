// @flow
import jwt from 'jsonwebtoken'
import type { ID } from '../types'
const JWT = require('../../secret/jwt.json')
const KEY = JWT.secretKey

export async function genToken(user : string) {
  return jwt.sign({_id: user}, KEY)
}

export async function checkToken(user : string, token: string) {
  try {
    const decode = jwt.verify(token, KEY)
    return decode._id === user
  } catch (err) {
    return false
  }
}
