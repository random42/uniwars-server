

class Team extends Game {
  constructor(arg) {
    super(arg);
    this.teams = arg.teams;
  }

  async init() {
    let op = db.teams.find({
      _id: {$in: this.teams},
    },
    {
      name: 1,
      picture: 1,
      perf: 1
    }).then((t) => {
      this.teams = t;
    })
    await Promise.all([super.init(),op]);
  }

  getStats(teams) {
    let stats = super.getStats();
    stats.teams = this.teams.slice();
    stats.teams[0].points = side0_points;
    stats.teams[1].points = side1_points;
  }


}


module.exports = Team;
