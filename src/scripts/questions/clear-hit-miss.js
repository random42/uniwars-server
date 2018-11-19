const monk = require('monk');
const db = require('../db');

db.db.then(async () => {
  let q = await db.questions.update({
    "$or": [
        {
            "hit": {
                "$exists": true
            }
        },
        {
            "miss": {
                "$exists": true
            }
        }
    ]
},{
    $unset: {
      hit: '',
      miss: ''
    }
  }, {
    multi: true
  })
  console.log(q)
  process.exit(0)
})
