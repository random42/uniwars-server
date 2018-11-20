import express from 'express'
export const router = express.Router()
import { user as C } from '../controllers'

router.get('/', C.getUser)

router.get('/search', C.search)

// TODO
router.delete('/', C.deleteUser)

router.get('/top', C.top)

router.get('/picture', C.getPicture);

router.put('/picture', C.updatePicture)

router.put('/add-friend', C.addFriend)

router.put('/respond-news', C.respondNews)

router.put('/remove-friend', C.removeFriend)

router.put('/block-user', C.blockUser)

router.put('/unblock-user', C.unblockUser)

router.put('/challenge-user', C.challengeUser)
