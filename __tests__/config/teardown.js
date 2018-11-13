module.exports = async function() {
  await global.MONGOD.stop()
}
