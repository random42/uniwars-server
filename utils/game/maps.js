let maps = {
  /*
    starting games indexed by _id
    waiting for players to join
    when all players join game is deleted from this map (and so from RAM)
    and game is pushed to db
    needed to keep track of users who joined and a join_timeout
  */
  starting: new Map(),

  /*
    key: game_id
    value: Map => key: user_id, value: question timeout
  */
  q_timeouts: new Map(),
}


module.exports = maps;
