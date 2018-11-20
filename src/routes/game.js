import express from 'express';
export const router = express.Router();
import { DB } from '../db';
import monk from 'monk';

router.put('/stuff', async (req,res,next) => {
  try {
    
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
})
