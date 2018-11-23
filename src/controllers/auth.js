import { genToken, checkToken, localLogin } from '../security'
import { User } from '../models'
const debug = require('debug')('http:auth')

export class AuthCtrl {

  static async register(req, res, next) {
    const data = req.body
    const user = await User.create(data)
    res.sendStatus(200)
  }

  static async login(req, res, next) {
    const { user, password } = req.body
    localLogin(user, password)
    .then(u => {
      genToken(u._id)
      .then((token) => {
        res.json({ user: u, token })
      })
      .catch(err => {
        console.log(err)
        res.sendStatus(500)
      })
    })
    .catch((err) => {
      console.log(err)
      res.status(400).json({error : err})
    })
  }

}
