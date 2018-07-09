let API = {
  USER :  {
    GET_USER: {
      method: 'get',
      url: 'user',
      params: {
        _id: '',
        project: ['full','small'],
      },
      response: {
        200: ["User"],
        400: ["Bad request"],
        404: ["User not found"]
      },
      description: "The 'project' field can be 'full' or 'small' (username, picture, uni, rating, online).",
    },
    TOP: {
      method: 'get',
      url: 'user/top',
      params: {
        from: 0,
        to: 20
      },
      response: {
        200: ["Array of users in small projection, with 'rank' field attacched"],
        400: ["Bad request"],
      },
      description: "Maximum distance is 30. There will probably be more params to specialize the search."
    },
    RANK: {
      method: 'get',
      url: 'user/rank',
      params: {
        _id: '',
      },
      response: {
        200: ["Array of users in small projection, with 'rank' field attacched"],
        400: ["Bad request"],
        404: ["User not found"]
      },
      description: "Returns array of 30 users, with requested user in the middle of array"
    },
    SEARCH: {
      method: 'get',
      url: 'user/search',
      params: {
        text: 'meme',
        page: 12,
      },
      response: {
        200: ["Array of {_id, username, uni}"],
        400: ["Bad request"],
      },
      description: "Results per page are 20."
    },
    REGISTER : {
      method: 'post',
      url: 'user/register',
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
        400: ["Email already registered","Username already taken","Bad request"],
        404: ["User not found"]
      },
      description: "Password rule is Aa1 and between 8-255 chars."
    },
    LOGIN : {
      method: 'put',
      url: 'user/login',
      params: {
        username: '',
        email: '',
      },
      data: {
        password: ''
      },
      response: {
        200: ["User"],
        400: ["Wrong password"],
        404: ["User not found"]
      },
      description: "",
    },
    LOGOUT : {
      method: 'put',
      url: 'user/logout',
      params: {
        username: 'random',
      },
      response: {
        200: ["User"],
        400: ["Bad request"],
      },
      description: "",
    },
    DELETE_ACCOUNT : {
      method: 'delete',
      url: 'user',
      data: {
        password: '',
      },
      response: {
        200: ["OK"],
        400: ["Bad request"],
        404: ["User not found"]
      },
      description: "Deletes profile picture from file system too.",
    },
    SET_PICTURE :  {
      method: 'put',
      url: 'user/picture',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      data: 'Buffer',
      params: {
        url: "https://"
      }
      response: {
        200: ["OK"],
        400: ["Bad request"]
      },
      description: "If 'url' is applied, no need to set data and headers as the image will be downloaded",
    },
    GET_PICTURE : {
      url : 'user/picture',
      params: {
        _id: '',
        size: ['small','medium','large'],
        response: {
          200: ["Image"],
          400: ["Bad request"]
        },
        description: "",
      }
    },
    CHALLENGE: {
      method: 'put',
      url: 'user/challenge',
      params: {
        to: "_id",
      },
      response: {
        200: ["OK"],
        400: ["Bad request"]
      },
      description: "Challenge another user to a solo game."
    },
    RESPOND_CHALLENGE: {
      method: 'put',
      url: 'user/respond-challenge',
      params: {
        response: ['y','n'],
        user: '_id'
      },
      response: {
        200: ["OK"],
        400: ["Bad request"]
      },
      description: ""
    },
    ADD_FRIEND: {
      method: 'put',
      url: 'user/add-friend',
      params: {
        to: '_id'
      },
      response: {
        200: ["OK"],
        400: ["Bad request"]
      },
      description: "",
    },
    RESPOND_FRIEND_REQUEST: {
      method: 'put',
      url: 'user/respond-friend-request',
      params: {
        response: ['y','n'],
        user: '_id'
      },
      response: {
        200: ["OK"],
        400: ["Bad request"]
      },
      description: "",
    },
  },

  GAME : {
  },

  UNI : {
    GET: {
      url: '/uni',
      params: {
        _id: "5a3dac7dfaaa577114d0cfaf"
      }
    },
    TOP: {
      url: '/uni/top',
      params: {
        from: 0,
        to: 10,
        field: 'general'
      }
    },
    RANK: {
      url: '/uni/rank',
      params: {
        name: "University of Turin",
        field: 'general'
      }
    }
  },

  TEAM : {
    GET: {
      url: 'team/',
      params: {
        _id: "5ab1768bceec0418f52e198f"
      }
    },
    INVITE: {
      method: 'put',
      url: 'team/invite',
      params: {
        team: '5abbd738ca93b62b48ff2f3b',
        invited: '5abbd736ca93b62b48ff2f36'
      }
    },
    CHALLENGE: {
      method: 'put',
      url: 'team/challenge',
      params: {
        team: '_id',
        enemy: '_id',
      }
    },
    RESPOND_CHALLENGE: {
      method: 'put',
      url: 'team/respond-challenge',
      params: {
        team: '_id',
        enemy: '_id',
      }
    },
    CREATE: {
      method: 'post',
      url: 'team/create',
      data: {
        name: "theBest",
      }
    },
    RESPOND_INVITE: {
      method: 'put',
      url: 'team/respond-invite',
      headers: {'user' : '5abbd736ca93b62b48ff2f36'},
      params: {
        team: "5abbd738ca93b62b48ff2f3b",
        response: 'y' // y/n
      }
    },
    DELETE: {
      method: 'delete',
      url: 'team/',
      params: {
        team: "5abbd738ca93b62b48ff2f3b"
      }
    }
  },

  CHAT : {
    GET_MESSAGES: {
      method: 'put',
      url: 'chat/messages',
      params: {
        time: Date.now(),
        chat: 'sdjgkfbsb'
      }
    },
    CREATE_GROUP: {
      method: 'post',
      url: 'chat/create-group',
      params: {
        name: 'asd',
        participants: ['_ids']
      }
    },
    CREATE_PRIVATE: {
      method: 'post',
      url: 'chat/create-private',
      params: {
        partner: '_id'
      }
    },
    LEAVE_GROUP: {
      method: 'put',
      url: 'chat/leave-group',
      params: {
        chat: '_id'
      }
    },
    ADD_user: {
      method: 'put',
      url: 'chat/add-user',
      params: {
        chat: '_id',
        invited: ['_ids']
      }
    },
    REMOVE_user: {
      method: 'put',
      url: 'chat/remove-user',
      params: {
        chat: '_id',
        removed: ['_ids']
      }
    }
  }
};

module.exports = API;
