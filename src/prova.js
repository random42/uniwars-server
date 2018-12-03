import { DB } from './db'
import { id } from 'monk'
import utils from './utils'

const games = DB.get('games')

let obj = {
  "_id": "5abbd98270534c2bf947416c",
  "prize": 100,
  "created_at": Date.now(),
  "started_at": Date.now(),
  "ended_at": Date.now(),
  "type": "solo", // solo, squad, team
  "players": [{
    "_id" : "",
    "side": 0, // 0, 1
    "username": "random",
    "joined": true, // tells if player has joined the game
    // TODO
    "answers": [{
      "question": "_id",
      "answer": "",
      "time": 3494 // milliseconds of answer
    }],
    "perf": {} // user perf, useful to have an improvement function of users
    // other users' fields during the game
  }],
  "current_question": 0,
  "question_timeout": Date.now(),
  "questions": [{
    "id": "a",
    "source": "https://opentdb.com/"
  },{
    "id": "b",
    "source": "https://opentdb.com/"
  },{
    "id": "c",
    "source": "https://opentdb.com/"
  }], // full objects during the game
  "result": 1, // 1 if side0 wins, 0.5 draw, 0 side1 wins
  "status": "play", // create, play
}

run().catch(console.log)

async function run() {
}
