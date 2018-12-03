import Ajv from 'ajv'
const USER = require('../../schemas/user.json')
const COMMON = require('../../schemas/common.json')
const SOCKET = require('../../schemas/socket.json')
const ajv = new Ajv({schemas: {
  'user.json': USER,
  'common.json': COMMON
}})


export function checkSchema(nsp) {
  const schemas = SOCKET[nsp].IN
  return function(packet, next) {
    const [ event, ...message ] = packet
    const schema = _.find(schemas, { event })
    if (!schema || message.length !== 1) return
    if (ajv.validate(schema, message[0]))
      next()
  }
}
