const db = require('./db');
const axios = require('axios');
const monk = require('monk')
const fs = require('fs');

db.db.then(async () => {
  let user = await db.users.findOne({username: 'random'});
  console.log(JSON.parse(JSON.stringify(user)));
  process.exit(0)
})

let print = (res) => {
  console.log(res.status);
  console.log(res.data);
}

const open_trivia = async () => {
  let token_req = await axios({
    baseURL: 'https://opentdb.com/api_token.php?command=request',
  });
  let token = token_req.data.token;
  console.log('Got token.')
  let re_quest = {
    baseURL: 'https://opentdb.com/api.php',
    params: {
      amount: 50,
      type: 'multiple',
      token
    }
  }
  let questions = [];
  let response_code = 0;
  console.log('Retrieving questions...')
  while (response_code === 0) {
    let req = await axios(re_quest);
    if (req.data.results) {
      questions = questions.concat(req.data.results);
    }
    response_code = req.data.response_code;
    console.log(questions.length);
  }
  if (response_code === 1) {
    console.log('Response code == 1');
    response_code = 0;
    while (response_code === 0) {
      let req = await axios({...re_quest,
        params: {
          amount: 1,
          type: 'multiple',
          token
        }
      });
      if (req.data.results) {
        questions = questions.concat(req.data.results);
      }
      response_code = req.data.response_code;
      console.log(questions.length);
    }
  }
  if (response_code !== 4) {
    console.log('Error',response_code);
    return;
  }
  console.log('Uploading questions...');
  await db.open_trivia.insert(questions);
  console.log('Writing json file...');
  let json = JSON.stringify(questions, null, "\t");
  fs.writeFileSync('open_trivia.json', json);
  console.log('Done!');
}

//open_trivia().then(() => process.exit(0));
