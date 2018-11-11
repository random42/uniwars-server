// @flow

const RANK = [
  {
    $sort: {}
  },
  {
    $group: {
      _id: null,
      doc: { $push: "$$ROOT" }
    }
  },
  {
    $unwind: {
      path: '$doc',
      includeArrayIndex: 'rank'
    }
  },
  {
    $project: {
      'doc.rank': '$rank'
    }
  },
  {
    $replaceRoot: { newRoot: '$doc' }
  }
]

/**
 * @param sort Object with sorting fields as keys and values 1 for
 * @param prepend Stages before sorting (note that sorting will not be indexed
 * if it's not the first stage)
 * @param append Stages after sorting
 * @return Pipeline array
 */
export function rank(
  sort : Object = { 'perf.rating': -1 },
  prepend? : Object[] = [],
  append? : Object[] = []) : Object[] {
  let pl = RANK
  pl[0].$sort = sort
  return prepend.concat(pl).concat(append)
}
