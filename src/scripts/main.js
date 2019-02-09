import "@babel/polyfill"
import monk from 'monk'
import { DB } from '../db'
import { USERS } from '../../data'
import fs from 'fs'

const writeToJson = (object, path) => {
  const json = JSON.stringify(object, null, '\t')
  fs.writeFileSync(path, json)
}

run().catch(console.log)

async function run() {
  console.log("Qriusity\n\n")
  const qriusity = await DB.get('qriusity_questions').aggregate([
    {
      $group: {
        _id: "$category.name",
        count: { $sum: 1 }
      }
    }
  ])
  console.dir(qriusity, {depth: null})
  console.log('\n\n\nOpen trivia\n\n')
  const trivia = await DB.get('open_trivia').aggregate([
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 }
      }
    }
  ])
  console.dir(trivia, {depth: null})
}
