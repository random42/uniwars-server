const MAJORS = require('../data/majors.json');

let categories = []
for (let i in MAJORS) {
  let a = MAJORS[i].major_category
  if (categories.indexOf(a) < 0) {
    categories.push(a);
  }
}


module.exports = categories;
