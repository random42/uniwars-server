// @flow
import monk from 'monk'
import { DB } from '../db'
import type { ID, Collection } from '../types'
import * as PL from './pipeline'

/**
 * Public members (properties) of subclasses are computed properties.
 * Default properties are in api/database-models.js
 *
 * @param arg Most of the times is a document object to load. Otherwise
 * it can be an ObjectID or an _id string (that will be converted to ObjectID)
 */
export class Model {

  _id: ID

  constructor(arg : ID | string | Object) {
    switch (typeof arg) {
      case 'string' : {
        this._id = monk.id(arg)
        break
      }
      case 'object': {
        if (arg.constructor && arg.constructor.name === 'ObjectID')
          this._id = arg
        else
          this.loadObject(arg)
        break
      }
    }
  }

  /**
   * Fetch documents with flexible options. Probably you call the function
   * from within a specific model class. In that case the last parameter must be omitted.
   *
   * @param match $match pipeline stage
   * @param projection What data to fetch, one of User.PROJ keys
   * @param _class Model class to fetch from
   */
  static async fetch(
    match : Object,
    projection: string,
    _class : any
    ) : Promise<Model[]> {
    const { rank, lookup, project, sort } = _class.FETCH[projection]
    // pipeline
    let append = []
    append.push({$match: match})
    if (lookup) {
      append = append.concat(lookup)
    }
    append.push({
      $project: project
    })
    const pipeline = rank ? PL.rank(sort, [], append) : append
    let docs = await DB.get('users').aggregate(pipeline)
    return docs.map(i => new _class(i))
  }

  /**
   * Fetch custom sorted documents choosing index of first one and quantity.
   * @param from Index (ranking) of first user. Starts from 0
   * @param offset Number of documents to fetch
   * @param sort Type of sort, key of _class.SORT
   * @param projection Fields to fetch, key of _class.FETCH
   * @param _class Model class to fetch from
   * @return Documents with rank field.
   */
  static async top(
    from : number,
    offset : number,
    sort : string,
    projection : string,
    _class: any
    ) : Promise<Model[]> {
    const { lookup, project } = _class.FETCH[projection]
    lookup = lookup ? lookup : []
    // adding $skip and $limit stages after $sort
    let append = [
      {
        $skip: from
      },{
        $limit: offset
      },
      ...lookup,
      {
        $project: project
      }
    ]
    const docs = await DB.get(_class.COLLECTION).aggregate(PL.rank(_class.SORT[sort], [], append))
    return docs.map(i => new _class(i))
  }


  loadObject(obj: Object) {
    Object.assign(this, obj)
  }
}
