const types = {
  "solo": require('./solo'),
  "squad" : require('./squad'),
  "team" : require('./team')
}

module.exports = ({side0, side1, type}) => {
  // game creation
  if (side0 && side1 && type) {
    
  }
  return new types[type](arguments[0])
}
