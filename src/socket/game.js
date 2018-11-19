import { DB } from '../db';
import monk from 'monk';
const {server} = require('./index');
const debug = require('debug')('socket:game')
import { Maps } from '../game';
import _ from 'lodash/core';
import { mm, utils } from '../utils';
let nsp = server.of('/game');
nsp.postAuthenticate = postAuthenticate



// game namespace post authenticate fn
async function postAuthenticate(socket) {
  //socket.setMaxListeners(20);
  const user = socket.user_id;
  // middleware
  socket.use((packet,next) => {
    let [ event, ...message ] = packet
    debug({
      user,
      event,
      message
    })
    next();
    // packet is array [event,...message]
  })
  //EVENTS
  socket.on('search',({type}) => {
    mm[type] && mm[type].push(user)
  });
  socket.on('stop_search',({type}) => {
    mm[type] && mm[type].pull(user)
  })

  // after new_game event emitted
  socket.on('join',({game}) => {
    Maps.starting.has(game) && Maps.starting.get(game).join(user);
  })

  socket.on('answer', async({answer, question, game}) => {
    // checks if user is in game
    if (!(game in socket.rooms) || game === socket.id)
      return
    // gets game
    try {
      let g = {}
      g.answer({user, question, answer})
    }
    catch(err) {
      console.log(err)
    }
  })
}
