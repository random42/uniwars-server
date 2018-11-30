import { DB } from './db'
import { id } from 'monk'
import utils from './utils'

const users = DB.get('users')

let obj = {
  _id: id(),
  arr: [
    id(),
    id(),
    {
      _id: id(),
      prova: {
        asd: {
          user_id: id()
        }
      }
    }
  ],
  asd: 'asd',
  mamma : 123
}
let arr = []
for (let i = 0; i < 5;i++) {
  arr.push(obj)
}

let big = {
  _id: id(),
  arr
}

run().catch(console.log)

async function run() {
  //console.dir(big, {depth: null})
  let asd = await users.insert(obj)
  console.dir(asd, {depth: null})
  //console.dir(asd, {depth: null})
  await users.findOneAndDelete(obj._id)
}
