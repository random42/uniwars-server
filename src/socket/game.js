import { server, game as nsp } from './index'
import { fetchGame } from '../game'
const debug = require('debug')('socket:game')
import _ from 'lodash/core'
import { checkSchema} from './middlewares'
import utils from '../utils'

// game namespace post authenticate fn
export default async function(socket: Socket, data: Object) {
  //socket.setMaxListeners(20);
  const user = socket.user._id
  socket.use(checkSchema('/game'))
  // async handler
  socket.use((packet, next) => {
    const [ event, ...message ] = packet
    debug({
      user,
      event,
      message
    })
    if (utils.isAsync(next)) {
      next().catch(console.log)
    }
    else next()
  })

  // after new_game event emitted
  socket.on('join', async ({ game, response }) => {
    const g = await fetchGame(game)
    if (!g) return
    await g.join(user, response)
  })

  socket.on('answer', async ({ answer, question, game }) => {
    const g = await fetchGame(game)
    if (!g) return
    await g.answer(user, question, answer)
  })
}
