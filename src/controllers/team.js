import { DB } from '../db'
const debug = require('debug')('http:team')
import fs from 'fs'
import socket from '../socket'
import monk from 'monk'
import {
  PAGE_RESULTS
} from '../constants'
import { User, Model, Team } from '../models'

export class TeamCtrl {
  static async getTeam(req, res, next) {
    const { _id, project } = req.query
    const docs = await Team.fetch({ _id }, project)
    if (docs.length === 0)
      res.sendStatus(404)
    let doc = docs[0]
    res.json(doc)
  }

  static async invite(req, res, next) {
    const { team, invited } = req.body
    const TEAM = await Model.findOne(team, Team)
    if (!(TEAM.areAdmins([req.user]) && TEAM.areNotMembers(invited)))
      return res.sendStatus(400)
    const news = {
      _id: monk.id(),
      type: "team_invitation",
      created_at: Date.now(),
      team
    }
    const promises = invited.map(u => {
      return Model.addNews(news, {
        _id: u,
        news: {
          $not: {
            $elemMatch: {
              type: 'team_invitation',
              team: team
            }
          }
        }
      }, User)
    })
    const results = await Promise.all(promises)
    results.forEach(r => {
      // if news was sent successfully
      if (r) {

      }
    })
  }

}
