const axios = require('axios');
const db = require('./db');
const fs = require('fs');
const API_KEY = '5bf6a06574cf4616f3c0fe36f189d40e';
const baseURL = 'https://api.uwaterloo.ca/v2/';
axios.defaults.baseURL = baseURL;
axios.defaults.params = {key: API_KEY}

let subjects = '/codes/subjects.json';
let courses = '/courses.json';
let groups = '/codes/groups.json';
let units = '/codes/units.json';



async function getData(url) {
  console.log('Making request')
  let req = {url}
  let res = await axios(req);
  console.log('Response with status',res.status)
  return res.data.data;
}

getData(units).then(data => {
  console.log('Data length =',data.length);
  let json = JSON.stringify(data,null,'\t');
  fs.writeFileSync('gen_data/uw_units.json',json);
  console.log('Wrote json file');
  process.exit(0);
}).catch(err => console.log(err));
