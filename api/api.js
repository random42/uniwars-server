const HTTP = {
  USER :  {
    GET_USER: {
      method: 'get',
      url: '/user',
      params: {
        _id: '',
        project: ['full','small'],
      },
      response: {
        200: ["User"],
        404: ["Not Found"]
      },
      title: "Get user",
      description: "The 'project' field can be either 'full' or 'small' (username, picture, uni, rating, online).",
    },
    TOP: {
      method: 'get',
      url: '/user/top',
      params: {
        from: 0,
        to: 20
      },
      response: {
        200: ["Array of users in small projection, with 'rank' field attacched"],
      },
      title: "Rankings",
      description: "Maximum distance is 30. There will probably be more params to specialize the search."
    },
    RANK: {
      method: 'get',
      url: '/user/rank',
      params: {
        _id: '',
      },
      response: {
        200: ["Array of users in small projection, with 'rank' field attacched"],
        404: ["Not Found"]
      },
      title: "Rankings around a specific user",
      description: "Returns array of 30 users sorted by rating, with requested user in the middle of array"
    },
    SEARCH: {
      method: 'get',
      url: '/user/search',
      params: {
        text: 'meme',
        page: 12,
      },
      response: {
        200: ["Array of {_id, username, uni}"],
      },
      title: "Search by username",
      description: "Results per page are 20."
    },
    REGISTER : {
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
    LOGIN : {
      method: 'put',
      url: '/user/login',
      params: {
        username: '',
        email: '',
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
    LOGOUT : {
      method: 'put',
      url: '/user/logout',
      params: {
      },
      response: {
        200: ["OK"],
      },
      title: "Logout",
      description: "",
    },
    DELETE_ACCOUNT : {
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
    SET_PICTURE :  {
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
    GET_PICTURE : {
      method: 'get',
      url : '/user/picture',
      params: {
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
    CHALLENGE: {
      method: 'put',
      url: '/user/challenge',
      params: {
        to: "_id",
      },
      response: {
        200: ["OK"],
      },
      title: "Challenge",
      description: "Challenge another user to a solo game."
    },
    RESPOND_CHALLENGE: {
      method: 'put',
      url: '/user/respond-challenge',
      params: {
        response: ['y','n'],
        user: '_id'
      },
      response: {
        200: ["OK"],
      },
      title: "Respond challenge",
      description: ""
    },
    ADD_FRIEND: {
      method: 'put',
      url: '/user/add-friend',
      params: {
        to: '_id'
      },
      response: {
        200: ["OK"],
      },
      title: "Add friend",
      description: "",
    },
    RESPOND_FRIEND_REQUEST: {
      method: 'put',
      url: '/user/respond-friend-request',
      params: {
        response: ['y','n'],
        user: '_id'
      },
      response: {
        200: ["OK"],
      },
      title: "Respond friend request",
      description: "",
    },
  },

  UNI : {
    GET: {
      method: 'get',
      url: '/uni',
      params: {
        _id: "5a3dac7dfaaa577114d0cfaf"
      },
      response: {
        200: ["Team"],
        400: ["Bad Request"],
        404: ["Not Found"]
      },
      title: "Get uni",
      description: ""
    },
    TOP: {

      // TODO
      method: 'get',
      url: '/uni/top',
      params: {
        from: 0,
        to: 10,
      },
      title: "",
    },
    RANK: {
      method: 'get',
      url: '/uni/rank',
      params: {
        name: "University of Turin",
      }
    }
  },

  TEAM : {
    GET: {
      method: 'get',
      url: '/team',
      params: {
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
    INVITE: {
      method: 'put',
      url: '/team/invite',
      params: {
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
    RESPOND_INVITE: {
      method: 'put',
      url: '/team/respond-invite',
      params: {
        team: "_id",
        response: ['y','n']
      },
      response: {
        200: ["OK"],
        400: ["Bad Request","Name already taken"],
      },
      title: "Respond invite",
      description: ""
    },
    CHALLENGE: {
      method: 'put',
      url: '/team/challenge',
      params: {
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
    RESPOND_CHALLENGE: {
      method: 'put',
      url: '/team/respond-challenge',
      params: {
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
    CREATE: {
      method: 'post',
      url: '/team/create',
      data: {
        name: "bestTeamEver",
      },
      response: {
        200: ["OK"],
        400: ["Bad Request","Name already taken"],
      },
      title: "Create team",
      description: "Team names follow the same rules of usernames."
    },
    DELETE: {
      method: 'delete',
      url: '/team',
      params: {
        _id: "5abbd738ca93b62b48ff2f3b"
      },
      response: {
        200: ["OK"],
      },
      title: "Delete team",
      description: "Rules TODO"
    }
  },

  CHAT : {
    GET_MESSAGES: {
      method: 'put',
      url: '/chat/messages',
      params: {
        time: Date.now()
      },
      response: {
        200: ["Array of all user's chats with messages after 'time'."],
      },
      title: "Get messages",
      description: ""
    },
    CREATE_GROUP: {
      method: 'post',
      url: '/chat/create-group',
      params: {
        name: 'asd',
        participants: ['_ids']
      },
      response: {
        200: ["Chat"],
      },
      title: "Create group chat",
      description: ""
    },
    CREATE_PRIVATE: {
      method: 'post',
      url: '/chat/create-private',
      params: {
        partner: '_id'
      },
      response: {
        200: ["Chat"],
      },
      title: "Create private chat",
      description: "Starts a private chat with another user."
    },
    LEAVE_GROUP: {
      method: 'put',
      url: '/chat/leave-group',
      params: {
        chat: '_id'
      },
      response: {
        200: ["OK"],
      },
      title: "Leave group",
      description: ""
    },
    ADD_USERS: {
      method: 'put',
      url: '/chat/add-users',
      params: {
        chat: '_id',
        invited: ['_ids']
      },
      response: {
        200: ["OK"],
      },
      title: "Add users to group",
      description: ""
    },
    REMOVE_USERS: {
      method: 'put',
      url: '/chat/remove-users',
      params: {
        chat: '_id',
        removed: ['_ids']
      },
      response: {
        200: ["OK"],
      },
      title: "Remove users from group",
      description: ""
    }
  }
}

const SOCKET = {
  MAIN: {
    IN: [],
    OUT: [
      {
        event: 'challenge',
        params: {
          type: 'solo/team',
          from: 'user or team _id',
          to: 'challenged team _id'
        },
        description: "Only team admins will receive a team challenge."
      },
      {
        event: 'friend_request',
        params: {
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
        params: {
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
        params: {
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
        params: {
          type: 'solo',
        },
        description: "The user will be pushed to the matchmaker of the specified game type."
      },
      {
        event: 'stop_search',
        params: {
          type: 'solo',
        },
        description: "The user will be pulled from the matchmaker of the specified game type."
      },
      {
        event: 'join',
        params: {
          _id: 'game _id',
        },
        description: "The user wants to join the created game."
      }
    ],
    OUT: [
      {
        event: 'new_game',
        params: {
          _id: 'game _id',
          type: 'solo'
        },
        description: "A new game can start, user must respond with 'join' message."
      },
      {
        event: 'start_game',
        params: {
          game: 'game object without questions',
        },
        description: "All players joined the game, so it's officially started."
      },
      {
        event: 'question',
        params: {
          question: 'object'
        },
        description: "Each question will be sent alone. After this message the question timer will start."
      },
      {
        event: 'mate_answer',
        params: {
          user: '_id',
          question: '_id',
          answer: ''
        },
        description: `Notifies a user of a teammate answer.
          It also notifies a user of his own answers.`
      },
    ]
  }
}

const PROJECTIONS = {
  USER: {
    FULL: {
      FIELDS: ['-email','-private','-activity'],
      COMPUTED: ['rank','uni','teams']
    },
    SMALL: {
      FIELDS: ['username','uni','major','perf','picture'],
      COMPUTED: []
    }
  },
  UNI: {
    FULL: {
      FIELDS: ['web_pages','name','country'],
      COMPUTED: ['rank','users_count','rating']
    }
  },
  TEAM: {
    FULL: {
      FIELDS: ['name','picture','users','perf'],
      COMPUTED: ['users','rank']
    }
  },
  CHAT: {
    INFOS: {
      FIELDS: ['-messages']
    }
  },
  GAME: {

  },
  QUESTION: {
    IN_GAME: {
      FIELDS: ['-source','-source_category']
    }
  }
}

module.exports = {HTTP,SOCKET,PROJECTIONS}
