// @flow

import _ from 'lodash'

export class Pipeline {

  static RANK = [
    {
      $group: {
        _id: null,
        DOC__: { $push: "$$ROOT" }
      }
    },
    {
      $unwind: {
        path: '$DOC__',
        includeArrayIndex: 'DOC__.rank'
      }
    },
    {
      $replaceRoot: { newRoot: '$DOC__' }
    }
  ]


  /**
   * Returns a pipeline that attach a custom named field containing
   * their index to the documents.
   *
   * @param field Field path in which the rank will be.
   */
  static rank(field : string = 'rank') : Object[] {
    const d = 'DOC__'
    let pl = _.cloneDeep(Pipeline.RANK)
    pl[1].$unwind.includeArrayIndex = d + "." + field
    return pl
  }
}
