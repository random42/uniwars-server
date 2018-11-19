const axios = require('axios')
const sharp = require('sharp')
const fs = require('fs')
const db = require('../db')

// using https://market.mashape.com/realfavicongenerator

const API_KEY = 'tkcnKuvXpamshhuN2QjZmmokt2urp1Rf2eyjsn21f8hrafajWK'
const BASE_URL = 'https://realfavicongenerator.p.mashape.com/favicon/icon'

const http = axios.create({
  baseURL: BASE_URL,
  headers: {'X-Mashape-Key': API_KEY}
})

async function getFavicon(domain) {
  let request = {
    params: {
      'site': domain,
      'platform': 'desktop'
    }
  }
  let res = await http(request)
  return res.data
}

async function getUnisDomains() {
  let pipeline = [
    {
      $project: {
        domains: 1
      }
    }
  ]
  let docs = await db.unis.aggregate(pipeline)
  for (let d of docs) {
    d._id = d._id.toString()
  }
  return docs
}

async function writeFile(path, data) {
  return new Promise((res, rej) => {
    fs.writeFile(path, data, function(err) {
      if (err) rej()
      else res()
    })
  })
}

async function getIcon(uni) {
  let found = false
  let i = 0
  let picture = undefined
  while (!found && i < uni.domains.length) {
    try {
      let pic = await getFavicon(uni.domains[i])
      found = true
      picture = pic
    } catch(err) {
      i++
    }
  }
  if (!picture)
    return Promise.reject("No icon")
  else return picture
}

async function main() {
  const unis = await getUnisDomains()
  let pic = await getIcon(unis[0])
  await writeFile('gen_data/unis_icons/' + unis[0]._id, pic)
}

main().then(() => {

}).catch(err => {
  console.log(err)
})
