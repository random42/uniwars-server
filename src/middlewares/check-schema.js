import _ from 'lodash'
import Ajv from 'ajv'

const USER = require('../../schemas/user.json')
const COMMON = require('../../schemas/common.json')
const HTTP = require('../../schemas/http.json')
let ROUTES = new Map()
for (let i in HTTP) {
  for (let r of HTTP[i]) {
    ROUTES.set(r.url, r)
  }
}

const ajv = new Ajv({schemas: {
  'user.json': USER,
  'common.json': COMMON
}})


export function checkSchema(req, res, next) {
  const { path } = req
  if (!ROUTES.has(path))
    return res.sendStatus(404)
  const route = ROUTES.get(path)
  let pass = true
  if (route.query && pass) {
    pass = ajv.validate(route.query, req.query)
  }
  if (route.body && pass) {
    pass = ajv.validate(route.body, req.body)
  }
  if (route.headers && pass) {
    pass = ajv.validate(route.headers, req.headers)
  }
  if (pass)
    next()
  else
    console.log(ajv.errors)
    return res.sendStatus(400)
}
