const user = {
  "_id": {
      "$oid": "5abbd98270534c2bf947416c"
  },
  "username": "random",
  "email": "roberto.sero@edu.unito.it",
  "first_name": "Roberto",
  "last_name": "Sero",
  "uni": {
      "$oid": "5a3dac7dfaaa577114d0cfaf"
  },
  "major": {
    "FOD1P": 1100,
    "name": "GENERAL AGRICULTURE",
    "category": "Agriculture & Natural Resources"
  },
  "perf": {
    "rating": 1234,
    "rd": 100, // rating deviation
    "vol": 0.06, // volatility
  },
  "stats": [{
    "category": "Engineering",
    "hit": 3425,
    "miss": 123
  }],
  "picture": {
    "small": "",
    "medium": "",
    "large": "",
  },
  "private": {
      "password": "$2a$12$DlPqzAkaq3r1PRAxHEDwI.mmx.R751qGKf90YY.QgvEE1AAYp/Kdi",
      "token": null,
      "phone_number": '+393461625500',
      "chats": ["_id"],
      "last_questions": ["_id"] // last tot questions
  },
  "teams": ["_ids"],
  "games": {
    "solo": {
      "wins": 123,
      "losses": 123,
      "draws": 44
    },
    "squad": {},
    "team": {}
  },
  "activity": [{
    "interval": {
      "start": 125254254,
      "end": 134452435,
    },
    "games": {
      "solo": 23,
      "squad": 12,
      "team": 1
    }
  }],
  "online_time": 796,
  "online": true,
  "playing": true,
  "friends": ["_ids"]
}

const team = {
  "_id": {
      "$oid": "5abbd98270534c2bf947416c"
  },
  "name": "MyTeam",
  "picture": {
    "small": "",
    "medium": "",
    "large": ""
  },
  // TODO
  "players": [
    {
      "_id": "",
      "admin": true
    }
  ],
  "founder": "_id",
  "perf": {
    "rating": 1234,
    "rd": 100, // rating deviation
    "vol": 0.06, // volatility
  },
  "challenges": ["team_id"],
  "games": {
    "wins": 12,
    "losses": 19,
    "draws": 12,
  },
  "chat": "_id",
}

const uni = {
  "_id": {
      "$oid": "5a3dac7dfaaa577114d0cfaf"
  },
  "web_pages": [
      "http://www.unito.it/"
  ],
  "name": "University of Turin",
  "alpha_two_code": "IT",
  "state-province": null,
  "domains": [
      "unito.it"
  ],
  "country": "Italy",
  "chat": "_id"
}

const chat = {
  "_id": {
      "$oid": "5abbd98270534c2bf947416c"
  },
  "collection": "unis", // teams, users
  "type": "group",    // group, duo
  "name": "bellaaa", // only for groups
  "messages": [{
    "_id": "34u893489374893",
    "text": "Ciaoo",
    "user": "_id", // taken from participants array
    "created_at": 12309234892,
  }],
  "participants": [
    {
      "_id": "",
      "admin": true
    }
  ],
}


const game = {
  "_id": {
      "$oid": "5abbd98270534c2bf947416c"
  },
  "created_at": Date.now(),
  "ended_at": Date.now(),
  "type": "solo", // solo, squad, team
  "players": [{
    "_id" : "",
    "side": 0, // 0, 1
    "index": 0, // index of current question
    // TODO
    "answers": [{
      "question": "_id",
      "answer": ""
    }],
    "rating": 2412
  }],
  // if it is a team game
  "teams": ["_id1","_id2"],
  "questions": ["_ids"],
  "result": 1, // 1, 0, 0.5
  "status": "play", // end
}

const question = {
  "_id": {
      "$oid": "5ad10d842d97600cc0f3639c"
  },
  "source": "https://opentdb.com/",
  "source_category": "Science: Computers",
  "category": "Computers & Mathematics",
  "majors": [],
  "question": "The Harvard architecture for micro-controllers added which additional bus?",
  "correct_answer": "Instruction",
  "incorrect_answers": [
    "Address",
    "Data",
    "Control"
  ],
  "difficulty": "hard",
  "language": "en",
  "hit": 123,
  "miss": 333
}
