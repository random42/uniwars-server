import { DB } from '../db';
import monk from 'monk';
import { server, game as nsp } from './index'
const debug = require('debug')('socket:game')
import { Maps } from '../game';
import _ from 'lodash/core';
import { mm, utils } from '../utils';

// game namespace post authenticate fn
export default async function(socket: Socket, data: Object) {
  //socket.setMaxListeners(20);
  const user = socket.user._id.toString()
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
