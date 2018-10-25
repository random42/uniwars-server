import express from 'express';
const router = express.Router();
import db from '../utils/db';
import bcrypt from 'bcrypt';
import monk from 'monk';

const game_types = [
  'solo',
  'squad',
  'team',
]

router.put('/stuff', async (req,res,next) => {
  try {

  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})

export default router;
