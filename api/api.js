const HTTP = [
  {
    method: 'get',
    url: '/user',
    query: {
      type: 'object',
      properties: {
        _id: {
          type: 'string',
          $ref: ''
        },
        project: {

        }
      }
    },
    response: {
      200: ["User"],
      404: ["Not Found"]
    },
    title: "Get user",
    description: "The 'project' field can be either 'full' or 'small' (username, picture, uni, rating, online).",
  },
  {
    method: 'get',
    url: '/user/top',
    query: {
      from: 0,
      to: 20
    },
    response: {
      200: ["Array of users in small projection, with 'rank' field attacched"],
    },
    title: "Rankings",
    description: "Maximum distance is 30. There will probably be more params to specialize the search."
  },
  {
    method: 'get',
    url: '/user/rank',
    query: {
      _id: '',
    },
    response: {
      200: ["Array of users in small projection, with 'rank' field attacched"],
      404: ["Not Found"]
    },
    title: "Rankings around a specific user",
    description: "Returns array of 30 users sorted by rating, with requested user in the middle of array"
  },
  {
    method: 'get',
    url: '/user/search',
    query: {
      text: 'meme',
      page: 12,
    },
    response: {
      200: ["Array of {_id, username, uni}"],
    },
    title: "Search by username",
    description: "Results per page are 20."
  },
  {
    method: 'post',
    url: '/user/register',
    data: {
      username: 'meme',
      email: 'gianni.verdi@unito.it',
      password: 'Mammamia123',
      major: "Computer Science",
      uni: "University of Turin",
      first_name: "Gianni",
      last_name: "Verdi"
    },
    response: {
      200: ["User"],
      400: ["Email already registered","Username already taken"],
    },
    title: "Register",
    description: "Password rule is Aa1 and between 8-255 chars."
  },
  {
    method: 'put',
    url: '/user/login',
    query: {
      user: 'email or username'
    },
    data: {
      password: ''
    },
    response: {
      200: ["{user, token}"],
      400: ["Wrong Password"],
      404: ["Not Found"]
    },
    title: "Login",
    description: "",
  },
  {
    method: 'put',
    url: '/user/logout',
    query: {
    },
    response: {
      200: ["OK"],
    },
    title: "Logout",
    description: "",
  },
  {
    method: 'delete',
    url: '/user',
    data: {
      password: '',
    },
    response: {
      200: ["OK"],
      400: ["Wrong password"],
      404: ["Not Found"]
    },
    title: "Delete account",
    description: "Deletes profile picture from file system too.",
  },
  {
    method: 'put',
    url: '/user/picture',
    headers: {
      'Content-Type': 'application/octet-stream'
    },
    data: 'Buffer',
    response: {
      200: ["OK"],
    },
    title: "Set profile picture",
    description: "",
  },
  {
    method: 'get',
    url : '/user/picture',
    query: {
      _id: '',
      size: ['small','medium','large'],
    },
    response: {
      200: ["Image"],
      404: ["Not Found"],
    },
    title: "Get profile picture",
    description: "",
  },
  {
    method: 'put',
    url: '/user/add-friend',
    query: {
      to: '_id'
    },
    response: {
      200: ["OK"],
    },
    title: "Add friend",
    description: "",
  },
  {
    method: 'put',
    url: '/user/respond-friend-request',
    query: {
      response: ['y','n'],
      to: '_id'
    },
    response: {
      200: ["OK"],
    },
    title: "Respond friend request",
    description: "",
  },
  {
    method: 'put',
    url: '/user/remove-friends',
    query: {
      friends: ['_ids']
    },
    response: {
      200: ["OK"],
    },
    title: "Remove friends",
    description: "",
  },
  {
    method: 'get',
    url: '/uni',
    query: {
      _id: "5a3dac7dfaaa577114d0cfaf"
    },
    response: {
      200: ["Team"],
      400: ["Bad Request"],
      404: ["Not Found"]
    },
    title: "Get uni",
    description: "Get uni with rank."
  },
  {
    method: 'get',
    url: '/uni/top',
    query: {
      from: 0,
      to: 10,
    },
    title: "Top",
    description: ""
  },
  {
    method: 'get',
    url: '/uni/rank',
    query: {
      name: "University of Turin",
    }
  },
  {
    method: 'get',
    url: '/team',
    query: {
      _id: "5ab1768bceec0418f52e198f"
    },
    response: {
      200: ["Team"],
      400: ["Bad Request"],
      404: ["Not Found"]
    },
    title: "Get team",
    description: ""
  },
  {
    method: 'put',
    url: '/team/invite',
    query: {
      team: '_id',
      invited: '_id'
    },
    response: {
      200: ["OK"],
      400: ["Bad Request"],
    },
    title: "Invite user to team",
    description: "Invite 'invited' user in 'team'. The user who invites must be a team admin."
  },
  {
    method: 'put',
    url: '/team/respond-invite',
    query: {
      team: "_id",
      response: ['y','n']
    },
    response: {
      200: ["OK"],
    },
    title: "Respond invite",
    description: ""
  },
  {
    method: 'put',
    url: '/team/challenge',
    query: {
      team: '_id',
      enemy: '_id',
    },
    response: {
      200: ["OK"],
      400: ["Bad Request"],
    },
    title: "Challenge team",
    description: "In order to challenge the user must be a team admin."
  },
  {
    method: 'put',
    url: '/team/respond-challenge',
    query: {
      team: '_id',
      enemy: '_id',
      response: ['y','n']
    },
    response: {
      200: ["OK"],
      400: ["Bad Request"],
    },
    title: "Respond team challenge",
    description: "In order to respond the challenge the user must be team admin."
  },
  {
    method: 'post',
    url: '/team/create',
    data: {
      name: "bestTeamEver",
      invited: ['_ids']
    },
    response: {
      200: ["OK"],
      400: ["Bad Request","Name already taken"],
    },
    title: "Create team",
    description: "Team names follow the same rules of usernames."
  },
  {
    method: 'delete',
    url: '/team',
    query: {
      _id: "5abbd738ca93b62b48ff2f3b"
    },
    response: {
      200: ["OK"],
    },
    title: "Delete team",
    description: "Rules TODO"
  },
  {
    method: 'put',
    url: '/chat/messages',
    query: {
      time: Date.now()
    },
    response: {
      200: ["Array of all user's chats with messages after 'time'."],
    },
    title: "Get messages",
    description: ""
  },
  {
    method: 'post',
    url: '/chat/create-group',
    query: {
      name: 'asd',
      participants: ['_ids']
    },
    response: {
      200: ["Chat"],
    },
    title: "Create group chat",
    description: ""
  },
  {
    method: 'post',
    url: '/chat/create-private',
    query: {
      partner: '_id'
    },
    response: {
      200: ["Chat"],
    },
    title: "Create private chat",
    description: "Starts a private chat with another user."
  },
  {
    method: 'put',
    url: '/chat/leave-group',
    query: {
      chat: '_id'
    },
    response: {
      200: ["OK"],
    },
    title: "Leave group",
    description: ""
  },
  {
    method: 'put',
    url: '/chat/add-users',
    query: {
      chat: '_id',
      invited: ['_ids']
    },
    response: {
      200: ["OK"],
    },
    title: "Add users to group",
    description: ""
  },
  {
    method: 'put',
    url: '/chat/remove-users',
    query: {
      chat: '_id',
      removed: ['_ids']
    },
    response: {
      200: ["OK"],
    },
    title: "Remove users from group",
    description: ""
  }
]

const SOCKET = {
  MAIN: {
    IN: [],
    OUT: [
      {
        event: 'challenge',
        object: {
          type: 'solo/team',
          from: 'user or team _id',
          to: 'challenged team _id'
        },
        description: "Only team admins will receive a team challenge."
      },
      {
        event: 'friend_request',
        object: {
          from: 'user _id'
        },
        description: ""
      },
    ]
  },
  CHAT: {
    IN: [
      {
        event: 'message',
        object: {
          msg: 'message object',
          chat: '_id',
          cb: 'callback'
        },
        description: "Incoming message. The callback returns the message with a server generated _id."
      }
    ],
    OUT: [
      {
        event: 'message',
        object: {
          msg: 'message object',
          chat: '_id',
        },
        description: "Notifies a user of a message."
      }
    ]
  },
  GAME: {
    IN: [
      {
        event: 'search',
        object: {
          type: 'solo',
        },
        response: null,
        description: "The user will be pushed to the matchmaker of the specified game type."
      },
      {
        event: 'stop_search',
        object: {
          type: 'solo',
        },
        response: null,
        description: "The user will be pulled from the matchmaker of the specified game type."
      },
      {
        event: 'join',
        object: {
          game: '_id',
          response: 'y' // y or anything else for no
        },
        response: 'game_start',
        description: "Response to 'new_game' event."
      },
      {
        event: 'answer',
        object: {
          game: '_id',
          question: '_id',
          answer: 'answer'
        },
        response: 'question',
        description: "Guess what"
      }
    ],
    OUT: [
      {
        event: 'new_game',
        object: {
          _id: 'game _id',
          type: 'solo'
        },
        response: 'join',
        description: "A new game can start, user must respond with 'join' message."
      },
      {
        event: 'game_start',
        object: {
          game: 'object',
        },
        response: null,
        description: `All players joined the game, so it's officially started.
        The game sent has all teams' and users' infos for the client to render.`
      },
      {
        event: 'question',
        object: {
          game: '_id',
          question: 'object'
        },
        response: 'answer',
        description: "Each question will be sent alone. After this message the question timer will start."
      },
      {
        event: 'mate_answer',
        object: {
          user: '_id',
          question: '_id',
          answer: ''
        },
        response: null,
        description: `Notifies a user of a teammate answer.
          It also notifies a user of his own answers.`
      },
      {
        event: 'game_end'
      }
    ]
  }
}


module.exports = { HTTP, SOCKET }
