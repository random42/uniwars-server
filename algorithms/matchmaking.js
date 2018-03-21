const Semaphore = require('await-semaphore').Semaphore;

const EVAL = {
  GEN_RATING_DIFF: 100,
  SAME_COUNTRY: 10,
  SAME_UNI: 10,
  SAME_MAJOR_CAT: 15,
  SAME_MAJOR: 15,
}
const MAX_TIME = 4000;

const MIN_EVAL = 50;

const MAX_RATING_DIFF = 2000;

let user_sample = {
  _id: '',
  rating: {
    general: 123
  },
  best_match: '_id',
  uni: '',
  max_comp: 10,
  major: '',
  insert_time: Date.now(),
  response: '',
  iterations: 0,
}

const Matchmaking = {
  _1v1 : {
    queue: [],

    compatibility(a,b) {
      let points = 0;
      let diff = Math.abs(a.rating.general - b.rating.general);
      let general = (MAX_RATING_DIFF - diff)/MAX_RATING_DIFF * EVAL.GEN_RATING_DIFF;
      points += general;
      console.log(points);
      points += a.uni._id === b.uni._id && EVAL.SAME_UNI;
      console.log(points)
      points += a.uni.alpha_two_code === b.uni.alpha_two_code && EVAL.SAME_COUNTRY;
      console.log(points);
      points += a.major.name === b.major.name && EVAL.SAME_MAJOR;
      points += a.major.category === b.major.category && EVAL.SAME_MAJOR_CAT;
      return points;

    },

    async match() {
      for (let i in this.queue) {
        let a = this.queue[i];
        for (let j in this.queue) {
          if (i === j) continue;
          let b = this.queue[j];
          if (a.best_match === b._id && b.best_match === a._id) {
            let release = await this.sem.acquire();
            this.queue.splice(i,1);
            this.queue.splice(j,1);
            release();
            createGame('1v1',[a,b])
          }
        }
      }
    }

    async evaluate() {
      console.log('match');
      if (this.queue.length === 0) {
        setTimeout(this.match,500);
        return;
      }
      for (let i in this.queue) {
        let release = await this.sem.acquire();
        let a = this.queue[i];
        for (let j in this.queue) {
          if (j === i) continue;
          let b = this.queue[j];
          let eval = compatibility(a,b);
          if (eval > a.max_comp) {
            a.max_comp = eval;
            a.best_match = b._id;
          }
        }
        a.iterations++;
        release();
      }
    },

    async push(user) {
      let release = await this.sem.acquire();
      this.queue.push({
        ...user,
        insert_time: Date.now(),
        max_comp: 0,
      });
      release();
    },

    sem: new Semaphore(1),
  },

  _5v5 : {
    queue: [],
    async push(user) {
      let release = await this.sem.acquire();
      this.queue.push({
        ...user,
        insert_time: Date.now(),
      });
      release();
    },
    sem: new Semaphore(1),
  }
}

async function createGame(type,_players) {
  try {
    let token = monk.id().toString();
    let players = _players.map((item) => monk.id(item._id));
    let hash = await bcrypt.hash(token,12);
    let game = await games.insert({
      type,
      players,
      questions: [],
      on_play: true,
      created_at: Date.now(),
      token: hash,
    });
    _players.forEach((player) => {
      player.response.json({_id: game._id,token});
    })
  } catch(err) {
    console.log(err);
  }
}

module.exports = Matchmaking
