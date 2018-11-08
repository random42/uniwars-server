// @flow

const secret = require('../../secret/db.json')
// TODO
const auth = secret.test
const database = require('monk')
(`mongodb://${auth.user}:${auth.password}@ds062797.mlab.com:62797/uniwars`)

export const db = {
  ...database
}
