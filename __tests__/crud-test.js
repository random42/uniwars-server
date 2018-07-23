const crud = require('../crud')
const db = require('../utils/db')
test('game', async () => {
  let g = await crud.game.fetchGameWithQuestions({game: "5b56285d58e0758edf8e66c5"})
  console.log(g.questions.map(q => q._id))
})
