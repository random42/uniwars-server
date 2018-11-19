const db = require('./db');
const users_db = db.get("users");
const unis_db = db.get("unis");
const teams_db = db.get("teams");
const monk = require('monk');
const readline = require('readline');
const fs = require('fs');
const chance = new (require('chance'))();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const USERS = require('./data/users.json');
const MAJORS = require('./data/majors.json');
let UNIS = []
//let USERS = require('./data/users.json')
//console.log('Users loaded in',Date.now()-now,'ms')
//let TEAMS = require('./data/teams.json')

// let major_categories = [MAJORS[0].major_category];
// let index = 0;
// for (let i = 1; i < MAJORS.length; i++) {
//   if (MAJORS[i].major_category !== major_categories[index]) {
//     major_categories[++index] = MAJORS[i].major_category;
//   }
// }
// console.log(major_categories);
// console.log(MAJORS.length);

// run().then(() => {
//   db.close();
//   process.exit();
// });

async function removeUniData() {
  await users_db.update({},{
    $unset: {
      "uni.web_pages": "",
      "uni.state-province": "",
      "uni.domains": "",
      "uni.country": "",
      "uni.rating": "",
      "uni.users": "",
      "uni.messages": ""
    }
  },{multi: true})
}

function createUsers(num, unis, majors) {
  majors = MAJORS.map((item) => {
    return {
      FOD1P: item.FOD1P,
      name: item.major,
      category: item.major_category,
    }
  });
  let users = [];
  console.log('Creating usernames...')
  let usernames = chance.unique(chance.word,num);
  console.log('Creating phone numbers...')
  let phones = chance.unique(chance.phone,num,{ formatted: false, mobile: true});
  console.log('Creating emails...')
  let uni_emails = chance.unique(randomUniAndEmail,num,{comparator: compareEmail, unis});
  console.log('Creating random properties...')
  for (let i = 0; i < num; i++) {
    users.push({
      username: usernames[i],
      ...uni_emails[i],
      ...randomUser(majors),
      phone: phones[i],
    })
  }
  return users;
}

function compareEmail (arr,el) {
  return arr.reduce(function(acc, item) {
    return acc || (item.email === el.email);
  }, false);
}

function randomUniAndEmail(arg) {
  let uni = chance.pickone(arg.unis);
  let domain = uni.domains[0];
  let obj = {
    uni: {
      _id: uni._id,
      name: uni.name,
      alpha_two_code: uni.alpha_two_code,
    },
    email: chance.email({domain})
  }
  return obj;
}

function randomUser(majors) {
  let user = {};
  user._id = monk.id();
  user.picture = chance.avatar({protocol: 'https'});
  user.major = chance.pickone(majors);
  user.gender = chance.gender();
  user.first_name = chance.first({gender: user.gender});
  user.last_name = chance.last();
  user.name = user.first_name + ' ' + user.last_name;
  user.online = chance.weighted([true,false],[1,5]);
  user.online_time = chance.natural({min: 0, max: 720000000});
  user.created_at = chance.natural({min: 1268771844000, max: Date.now()});
  user.perf = {};
  user.perf.rating = chance.natural({min: 500,max: 2500});
  user.password = chance.string({length: 8});
  return user;
}

async function genUniRatings() {
  try {
    let time = Date.now();
    let objs = await users_db.aggregate([
      {$sort : {
        "uni._id": 1,
      }},
      {$group : {
        _id: "$uni._id",
        general_rating: {
          $avg: "$rating.general"
        },
        major_category_rating: {
          $avg: "$rating.major_category"
        },
        count: {
          $sum: 1
        }
      }},
    ]);
    let updated = await Promise.all(
      objs.map((item) => {
        return unis_db.findOneAndUpdate({_id: item._id},{
          $set: {
            rating: {
              general: Math.round(item.general_rating),
              major_category: Math.round(item.major_category_rating),
            },
            users: item.count
          }
        })
      })
    )
    console.log('Unis\' ratings updated in',Date.now()-time,'ms')
  } catch(err) {
    console.log(err);
  }
}

function createTeams(users) {
  let init = Date.now()
  let i = 0;
  let teams = [];
  let names = chance.unique(chance.word,users.length/5);
  while (i < users.length) {
    let team_size = chance.natural({min: 5, max: 10});
    let team_index = teams.push({
      _id: monk.id().toString(),
      name: names[teams.length],
      picture: chance.avatar({protocol: 'https'}),
      players: [],
      rating: chance.natural({min: 500, max: 3000})
    }) -1;
    let team = teams[team_index];
    for (let j = 0; j < team_size && i < users.length; j++) {
      team.players.push(users[i]._id);
      i++;
    }
  }
  let lastTeam = teams[teams.length-1];
  if (lastTeam.players.length < 5) {
    let num = lastTeam.players.length;
    let i = 0;
    let j = teams.length-2;
    while (i < num) {
      while (teams[j].players.length < 10 && i<num) {
        teams[j].players.push(lastTeam.players[i++]);
      }
      j++;
    }
    teams.pop();
  }
  console.log('Teams created in',Date.now()-init,'ms');
  return teams;
}

async function deleteUsers(num) {
  try {
    let time = Date.now();
    console.log('Getting ids..');
    let deleted = await users_db.aggregate([{
      $limit: num
    },{
      $project: {_id: 1}
    }]);
    console.log('Mapping array..');
    deleted = deleted.map((item) => item._id);
    console.log('Deleting users..');
    let deletion = await users_db.remove({
       _id: {$in : deleted}
    });
    console.log(num,'users deleted in',Date.now()-time,'ms');
  } catch (err) {
    console.log(err);
  }

}

async function setTeamInUsers() {
  let init = Date.now()
  await Promise.all(
    TEAMS.map((item) => {
      return users_db.update({_id: {$in: item.players}},{
        $set: {
          team: {
            _id: item._id,
            name: item.name,
            picture: item.picture,
          }
        }
      },{
        multi: true
      })
    })
  )
  console.log('Users updated in',Date.now()-init);
}

async function run() {
  try {

    console.log('\nDone!');
  } catch(err) {
    console.log(err);
  }
}


module.exports = {
  createUsers,
  createTeams,
}
