module.exports = async function() {
  await global.__MONGOD__.stop()
  console.log('DB stopped')
}
