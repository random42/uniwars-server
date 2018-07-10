const API = {
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
      description: "Returns array of 30 users, with requested user in the middle of array"
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
        200: ["User"],
        400: ["Wrong Password"],
        404: ["Not Found"]
      },
      description: "",
    },
    LOGOUT : {
      method: 'put',
      url: '/user/logout',
      params: {
        username: 'random',
      },
      response: {
        200: ["OK"],
      },
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
      description: "Deletes profile picture from file system too.",
    },
    SET_PICTURE :  {
      method: 'put',
      url: '/user/picture',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      data: 'Buffer',
      params: {
        url: "https://"
      }
      response: {
        200: ["OK"],
        400: ["Bad Request"]
      },
      description: "If 'url' is applied, no need to set data and headers as the image will be downloaded",
    },
    GET_PICTURE : {
      method: 'get',
      url : 'user/picture',
      params: {
        _id: '',
        size: ['small','medium','large'],
        response: {
          200: ["Image"],
          400: ["Bad Request"],
          404: ["Not Found"]
        },
        description: "",
      }
    },
    CHALLENGE: {
      method: 'put',
      url: '/user/challenge',
      params: {
        to: "_id",
      },
      response: {
        200: ["OK"],
        400: ["Bad Request"]
      },
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
        400: ["Bad Request"]
      },
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
        400: ["Bad Request"]
      },
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
        400: ["Bad Request"]
      },
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
      description: ""
    },
    TOP: {
      method: 'get',
      url: '/uni/top',
      params: {
        from: 0,
        to: 10,
      }
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
        400: ["Bad Request"],
      },
      description: "Rules TODO"
    }
  },

  CHAT : {
    GET_MESSAGES: {
      method: 'put',
      url: '/chat/messages',
      params: {
        time: Date.now(),
        chat: 'sdjgkfbsb'
      }
    },
    CREATE_GROUP: {
      method: 'post',
      url: '/chat/create-group',
      params: {
        name: 'asd',
        participants: ['_ids']
      }
    },
    CREATE_PRIVATE: {
      method: 'post',
      url: '/chat/create-private',
      params: {
        partner: '_id'
      }
    },
    LEAVE_GROUP: {
      method: 'put',
      url: '/chat/leave-group',
      params: {
        chat: '_id'
      }
    },
    ADD_USER: {
      method: 'put',
      url: '/chat/add-user',
      params: {
        chat: '_id',
        invited: ['_ids']
      }
    },
    REMOVE_USER: {
      method: 'put',
      url: '/chat/remove-user',
      params: {
        chat: '_id',
        removed: ['_ids']
      }
    }
  }
};

module.exports = API;
