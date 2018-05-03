const glicko2 = require('glicko2');
let settings = {
  // tau : "Reasonable choices are between 0.3 and 1.2, though the system should
  //       be tested to decide which value results in greatest predictive accuracy."
  tau : 0.5,
  // rating : default rating
  rating : 1500,
  //rd : Default rating deviation
  //     small number = good confidence on the rating accuracy
  rd : 100,
  //vol : Default volatility (expected fluctation on the player rating)
  vol : 0.06
};

let ranking = new glicko2.Glicko2(settings);

function soloMatch([side0], [side1], result) {
  side0 = side0.perf, side1 = side1.perf
  let a = ranking.makePlayer(side0.rating,side0.rd,side0.vol);
  let b = ranking.makePlayer(side1.rating,side1.rd,side1.vol);
  let match = [[a,b,result]];
  ranking.updateRatings(match);
  return {
    side0: {
      rating: a.getRating(),
      rd: a.getRd(),
      vol: a.getVol()
    },
    side1: {
      rating: b.getRating(),
      rd: b.getRd(),
      vol: b.getVol()
    }
  }
}

function squadMatch(side0, side1, result) {

}

module.exports = {soloMatch, squadMatch}
