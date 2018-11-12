const secret = require('../../secret/db.json')
const env = process.env.NODE_ENV
const uri = secret[env].uri
export const DB = require('monk')(uri)
