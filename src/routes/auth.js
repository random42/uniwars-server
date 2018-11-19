import express from 'express'
import { auth as C } from '../controllers'
export const router = express.Router()
router.post('/register', C.register)
router.post('/login', C.login)

// router.get('/google',
//   passport.authenticate('google', { scope: ['email','profile'] })
// )
//
//
// router.use('/google/callback',
//   debugRequest,
//   passport.authenticate('google'),
//   function(req,res,next) {
//     debug(req.user)
//     res.sendStatus(200)
//   }
// )
