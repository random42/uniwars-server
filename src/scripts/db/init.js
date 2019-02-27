// @flow
import monk from 'monk'

const COLLECTIONS = [
  {
    name: "users",
    creationOptions: {},
    indexes: [
      {
        fields: {
          "perf.rating": -1
        },
        options: {
          name: "rating"
        }
      },
      {
        fields: {
          "uni._id": 1
        },
        options: {
          sparse: true,
          name: "unis"
        }
      }
    ]
  },
  {
    name: "games",
    creationOptions: {},
    indexes: [
      {
        fields: {
          "players._id": 1,
        },
        options: {
          name: "game_players"
        }
      }
    ]
  },
  {
    name: "ended_games",
    creationOptions: {},
    indexes: []
  },
  {
    name: "live_games",
    creationOptions: {},
    indexes: []
  },
  {
    name: "unis",
    creationOptions: {},
    indexes: []
  },
  {
    name: "questions",
    creationOptions: {},
    indexes: []
  },
  {
    name: "teams",
    creationOptions: {},
    indexes: [
      {
        fields: {
          "perf.rating": -1
        },
        options: {
          name: "rating"
        }
      }
    ]
  }
]

export async function init(uri: String) {
  const db = await monk(uri)
  for (let c of COLLECTIONS) {
    const coll = db.create(c.name, c.creationOptions)
    if (!c.indexes) continue
    for (let i of c.indexes) {
      coll.ensureIndex(i.fields, i.options)
    }
  }
}
