const express = require('express');
const router = express.Router();
const db = require('../db');
const monk = require('monk');
const myDb = {
  uni: db.get('unis'),
  team: db.get('teams')
}

router.get('/',function(req,res,next) {
  let time = +req.query.time;
  let type = req.query.type; // myDb properties
  let id = req.query.id;
  myDb[type].aggregate([{
    $match: {_id: monk.id(id)}
  },{
    $project: {
      messages: {
            $filter: {
                input: '$messages',
                as: 'mess',
                cond: { $gt: ['$$mess.time', time] }
            }
        }
    }
  }]).then(docs => {
    if (docs.length === 1) {
      res.send(docs[0].messages);
    }
    else {
      res.sendStatus(404);
    }
  }).catch(err => {
    console.log(err);
    res.sendStatus(500);
  });
});

router.post('/',function(req,res,next) {
  let message = req.body;
  let type = req.query.type;
  let id = req.query.id;
  message._id = monk.id();
  if (!message || !id) {
    res.sendStatus(406);
  }
  myDb[type].findOneAndUpdate({_id: id},{
    $push: {messages : message}
  }).then(doc => {
    console.log(doc);
    res.sendStatus(200);
  }).catch(err => {
    console.log(err);
    res.sendStatus(500);
  })
})

module.exports = router;
