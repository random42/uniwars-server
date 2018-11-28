import monk from 'monk'
import jwt from 'jsonwebtoken'
const JWT = require('../../secret/jwt.json')

/**
 * Authorize request by checking user's _id in 'User' header and token
 * in 'Authorization' header. Sets req.user field on success.
 *
 * @return Status 401 if not authorized.
 */
export function checkAuth(req, res, next) {
  const token = req.get("Authorization")
  const user = req.get("User")
  try {
    const decode = jwt.verify(token, JWT.secretKey)
    if (decode._id !== user) {
      return res.sendStatus(401)
    }
    req.user = monk.id(user)
    next()
  } catch(err) {
    res.status(401).json({error: err})
  }
}
