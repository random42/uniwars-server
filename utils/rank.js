//const db = require('../db');
const MAX_RESULTS = 50;

module.exports = {
  async top({coll,from,to,sort,projection}) {
    try {
      if (to - from > MAX_RESULTS) {
        return false;
      }
      let docs = await coll.aggregate([
        {$sort: sort},
        {$skip: from},
        {$limit: to-from},
        {$project: projection}
      ]);
      return docs;
    } catch (err) {
      console.log(err);
      return false;
    }

  },

  async rank({coll,query,sort}) {
    try {
      let project = {};
      //project['_id'] = "$_id";
      for (let field in query) {
        project[field] = "$"+field;
      }
      let docs = await coll.aggregate([
        {$sort: sort},
        {
          $group: {
            _id: null,
            doc: {
              $push: project
            }
          }
        },
        {
          $unwind: {
            path: "$doc",
            includeArrayIndex: "ranking"
          }
        },
        {
          $match: {
            doc: query
          }
        }
      ]);
      if (docs.length === 0) {
        return false;
      }
      return docs[0].ranking;
    } catch (err) {
      return false;
    }
  }
}
