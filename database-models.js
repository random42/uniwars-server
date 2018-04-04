const user = {
  "_id": {
      "$oid": "5abbd98270534c2bf947416c"
  },
  "username": "random",
  "email": "roberto.sero@edu.unito.it",
  "first_name": "Roberto",
  "last_name": "Sero",
  "full_name": "Roberto Sero",
  "uni": {
      "_id": {
          "$oid": "5a3dac7dfaaa577114d0cfaf"
      },
      "name": "University of Turin",
      "alpha_two_code": "IT"
  },
  "major": {
    "FOD1P": 1100,
    "name": "GENERAL AGRICULTURE",
    "category": "Agriculture & Natural Resources"
  },
  "rating": {
    "general": 1234,
    "major_category": 9434
  },
  "stats": [{
    "category": "Engineering",
    "questions": 3425,
    "correct": 123
  }],
  "picture": {
    "small": "",
    "medium": "",
    "large": "",
  },
  "private": {
      "password": "$2a$12$DlPqzAkaq3r1PRAxHEDwI.mmx.R751qGKf90YY.QgvEE1AAYp/Kdi",
      "login_token": null,
      "phone_number": '+393461625500'
  },
  "teams": ["_id"],
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
    "games": 21,
    "chat_time": 124454,
  }],
  "news": {
    "teams": {
      "invitations": [{
        "team": "team_id",
        "user": "user_id"
      }],
      "challenges": ["_id"]
    },
    "friend_req": ["_id"],
    "challenges": ["_id"]
  },
  "online_time": 796,
  "online": false,
}

const team = {
  "_id": {
      "$oid": "5abbd98270534c2bf947416c"
  },
  "name": "MyTeam",
  "picture": "http://asdasdasd",
  "players": ["5abbd98270534c2bf947416c"],
  "admins": [],
  "founder": "5abbd98270534c2bf947416c",
  "rating": 3214,
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
    "users": 20,
}

const chat = {
  "_id": {
      "$oid": "5abbd98270534c2bf947416c"
  },
  "collection": "unis" // teams, users
  "type": "group"    // group, duo
  "messages": [{
    "_id": "34u893489374893",
    "text": "Ciaoo",
    "user": "_id", // taken from partecipants array
    "created_at": 12309234892,
    "system": true,
  }],
  "partecipants": ["_id"]
}
