const bcrypt = require('bcrypt')
const monk = require('monk')

let data = []
for (let i = 0; i < 100; i ++) {
  data.push(monk.id().toString())
}
let hashes = []

let times = []

test()
printTimes()

function printTimes() {
  for (let i in times) {
    console.log('rounds:', times[i].rounds)
    console.log('hash', timeToString(times[i].hash))
    console.log('compare', timeToString(times[i].compare))
  }
}

function timeToString(time) {
  return (time / 1000 + " s")
}

function test() {
  for (let rounds = 1; rounds < 12; rounds++) {
    let record = {
      rounds,
      hash: 0,
      compare: 0
    }
    for (let i in data) {
      let t0 = Date.now()
      hashes[i] = bcrypt.hashSync(data[i], rounds)
      let t1 = Date.now()
      let c = bcrypt.compareSync(data[i], hashes[i])
      let t2 = Date.now()
      if (!c) console.log('strange')
      record.hash += t1 - t0
      record.compare += t2 - t1
    }
    times.push(record)
  }
}
