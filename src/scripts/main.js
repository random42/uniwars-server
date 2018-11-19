import monk from 'monk'
//import { DB } from '../db'
import { USERS } from '../../data'
import fs from 'fs'

const writeToJson = (object, path) => {
  const json = JSON.stringify(object, null, '\t')
  fs.writeFileSync(path, json)
}

const { HTTP, SOCKET }  = require('../../api/api')
writeToJson(HTTP, 'schemas/http.json')
writeToJson(SOCKET, 'schemas/socket.json')
