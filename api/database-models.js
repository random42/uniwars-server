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
  "major": "GENERAL AGRICOLTURE",
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
  "private": {
    "password": "$2a$12$DlPqzAkaq3r1PRAxHEDwI.mmx.R751qGKf90YY.QgvEE1AAYp/Kdi",
    "access_token": null,
    "phone_number": '+393461625500',
    "chats": ["_id"],
    "last_questions": ["_id"], // last tot questions
    "friend_requests": ["users_ids"],
    "news": [
      {
        "type": "friend_request"
        "user": "_id"
      },{
        "type": "team_invitation",
        "team": "_id",
        "user": "_id"
      },{
        "type": "solo_challenge",
        "user": "_id"
      }
    ]
  },
  "teams": ["_ids"],
  "games": [{
    "type": "solo",
    "wins": 1234,
    "losses": 1234,
    "draws": 43
  }],
  "online_time": 796,
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
  "users": [
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
  "state_province": null,
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
  "type": "solo", // solo, squad
  "players": [{
    "_id" : "",
    "side": 0, // 0, 1
    "index": 0, // index of current question
    // TODO
    "answers": [{
      "question": "_id",
      "answer": ""
    }],
    "perf": {} // to have an improvement function of users
  }],
  // if it is a team game
  "teams": ["_ids"],
  "questions": ["_ids"],
  "result": 1, // 1 if side0 wins, 0.5 draw, 0 side1 wins
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
