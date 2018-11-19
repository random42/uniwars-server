const db = require('./db');
const fs = require('fs');
// const chance = new (require('chance'))();
// let categories = require('./categories');
// let qriusity = require('../data/qriusity_questions.json');
// let open_trivia = require('../data/open_trivia.json');

let questions = db.questions.find({}).then(q => {
  let json = JSON.stringify(q,null,"\t");
  fs.writeFileSync('../data/questions.json',json);
  process.exit(0);
})


function openTriviaCategories() {
  let questions = require('../data/open_trivia.json');
  let cat = [];
  for (let i in questions) {
    if (cat.indexOf(questions[i].category) < 0) {
      cat.push(questions[i].category);
    }
  }
  return cat;
}

async function convertOpenTrivia() {
  let questions = require('../data/open_trivia.json');
  console.log('Mapping')
  let map = questions.map((item) => {
    delete item._id;
    item.question = convertString(item.question);
    item.correct_answer = convertString(item.correct_answer);
    for (let i in item.incorrect_answers) {
      item.incorrect_answers[i] = convertString(item.incorrect_answers[i]);
    }
    return item;
  });
  console.log('Writing json');
  let json = JSON.stringify(map,null,"\t");
  fs.writeFileSync('open_trivia.json', json);
  // console.log('Uploading');
  // await db.open_trivia.insert(map);
  // console.log('Done')
}

async function qriusityJson() {
  console.log('Downloading questions..')
  let questions = await db.qriusity_questions.find({});
  console.log('Creating json string..');
  let json = JSON.stringify(questions,null,"\t");
  console.log('Writing file..');
  fs.writeFileSync('qriusity_questions.json', json);
  console.log('Finished.');
}

function qriusityCategories() {
  let questions = require('../data/qriusity_questions.json');
  let cat = [];
  for (let i in questions) {
    if (cat.indexOf(questions[i].category.name) < 0) {
      cat.push(questions[i].category.name);
    }
  }
  return cat;
}

let trivia_map = {
  'Science: Computers': 'Computers & Mathematics',
  'Sports': 'General',
  'Entertainment: Video Games': 'Computers & Mathematics',
  'General Knowledge': 'Humanities & Liberal Arts',
  'History': 'Humanities & Liberal Arts',
  'Entertainment: Television': 'General',
  'Entertainment: Books': 'General',
  'Science & Nature': 'Biology & Life Science',
  'Art': 'Arts',
  'Geography': 'Social Science',
  'Politics': 'Law & Public Policy',
  'Entertainment: Film': 'Arts',
  'Entertainment: Music':  'Arts',
  'Celebrities': 'General',
  'Entertainment: Comics': 'General',
  'Entertainment: Board Games': 'General',
  'Vehicles': 'Engineering',
  'Entertainment: Japanese Anime & Manga': 'General',
  'Entertainment: Musicals & Theatres': 'Arts',
  'Entertainment: Cartoon & Animations': 'General',
  'Mythology': 'Humanities & Liberal Arts',
  'Science: Mathematics': 'Computers & Mathematics',
  'Animals': 'Agriculture & Natural Resources',
  'Science: Gadgets': 'Engineering'
}

let qriusity_map = {
  'Biology': 'Biology & Life Science',
  'Literature': 'Humanities & Liberal Arts',
  'Chemistry': 'Physical Sciences',
  'Greek Mythology': 'Humanities & Liberal Arts',
  'Bible': 'Humanities & Liberal Arts',
  'Science': 'Biology & Life Science',
  'Physics': 'Physical Sciences',
  'World History': 'Humanities & Liberal Arts',
}

function convertString(string) {
  let map = {
    '&amp': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'"
  }
  return string.replace(/(&amp)|(&lt;)|(&gt;)|(&quot;)|(&#039;)/g, function(m) { return map[m]; });
}

function mapAll() {
  let questions = [];
  console.log('Mapping..');
  for (let i in open_trivia) {
    let q = open_trivia[i];
    questions.push({
      source: "https://opentdb.com/",
      source_category: q.category,
      category: trivia_map[q.category],
      question: q.question,
      correct_answer: q.correct_answer,
      incorrect_answers: q.incorrect_answers,
      difficulty: q.difficulty,
    });
  }
  for (let i in qriusity) {
    let q = qriusity[i];
    let answer = 'option'+q.answers;
    let correct_answer = q[answer];
    let incorrect_answers = [];
    for (let j = 1;j < 5;j++) {
      let option = 'option' + j;
      if (option !== answer) {
        incorrect_answers.push(q[option]);
      }
    }
    let question = {
      source: "https://qriusity.com/",
      source_category: q.category.name,
      category: (q.category.name in qriusity_map) ? qriusity_map[q.category.name] : 'General',
      question: q.question,
      correct_answer,
      incorrect_answers,
    }
    questions.push(question);
  }
  return questions;
}
