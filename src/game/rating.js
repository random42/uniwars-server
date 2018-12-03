// @flow

import glicko2 from 'glicko2-lite'
import type { Perf, GameResult } from '../types'


export function soloMatch(p0 : Perf, p1 : Perf, result: GameResult) : Perf[] {
  const n0 = glicko2(p0.rating, p0.rd, p0.vol, [[p1.rating, p1.rd, result]])
  const r2 = Math.abs(result - 1)
  const n1 = glicko2(p1.rating, p1.rd, p1.vol, [[p0.rating, p0.rd, r2]])
  return [n0, n1]
}

export default module.exports
