import monk from 'monk'
import { stringifyIds } from './middlewares'
const secret = require('../../secret/db.json')
const env = process.env.NODE_ENV
const uri = process.env.MONGO_URI || secret[env].uri
export const DB = monk(uri)

DB.addMiddleware(stringifyIds)
