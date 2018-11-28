// @flow
import monk from 'monk'
import { DB, Pipeline } from '../db'
import type { ID, Collection } from '../types'
import _ from 'lodash'

/**
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

  static async findOne(_id: ID, _class : any) : Promise<Model> {
    const obj = await DB.get(_class.COLLECTION).findOne(_id)
    return new _class(obj)
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
    let { prepend, append, project, collection } = _class.QUERY[projection]
    prepend = prepend || []
    append = append || []
    collection = collection || _class.COLLECTION
    // pipeline
    let pipeline = [...prepend]
    pipeline.push({$match: match})
    pipeline = pipeline.concat(append)
    pipeline.push({
      $project: project
    })
    let docs = await DB.get(collection).aggregate(pipeline)
    return docs.map(i => new _class(i))
  }

  /**
   * Fetch custom sorted documents choosing index of first one and quantity.
   * @param skip Index (ranking) of first user. Starts from 0
   * @param limit Number of documents to fetch
   * @param sort Type of sort, key of _class.SORT
   * @param projection Set of fields to fetch, key of _class.QUERY
   * @param _class Model class to fetch from
   * @return Documents with rank field.
   */
  static async top(
    skip : number,
    limit : number,
    sort : string,
    projection : string,
    _class: any
    ) : Promise<Model[]> {
    // prepend is not used as sorting and rank is obvius
    let { append, project, collection } = _class.QUERY[projection]
    append =  append || []
    collection = collection || _class.COLLECTION
    let pipeline = [
      {
        $sort: _class.SORT[sort]
      },
      ...Pipeline.rank('rank'),
      {
        $skip: skip
      },{
        $limit: limit
      },
      ...append,
      {
        $project: project
      }
    ]
    const docs = await DB.get(collection).aggregate(pipeline)
    return docs.map(i => new _class(i))
  }

  /**
   * Add a news object.
   *
   * @param news
   * @param query MongoDB query object
   * @param collection
   *
   * @return updated document
   */
  static async addNews(
    news: Object,
    query: Object | string,
    _class: any
    ) : Promise<Model> {
    const update = await DB.get(_class.COLLECTION).findOneAndUpdate(query, {
      $push: {
        news
      }
    })
    return update
  }

  static async pullNews(
    query: Object | string,
    news : ID,
    _class: any
    ) : Promise<Object> {
    const doc = await DB.get(_class.COLLECTION).findOneAndUpdate(query, {
      $pull: {
        'news': {
          _id: news
        }
      }
    }, {
      projection: {news: 1},
      returnOriginal: true
    })
    const newsObj = _.find(doc.news, (o) => o._id.equals(news))
    return newsObj
  }

  static async fetchNews(
    query: Object | string,
    news : ID,
    _class: any
    ) : Promise<Object> {
    const doc = await DB.get(_class.COLLECTION).findOne(query, {
      fields: {news: 1}
    })
    const newsObj = _.find(doc.news, (o) => o._id.equals(news))
    return newsObj
  }

  loadObject(obj: Object) {
    Object.assign(this, obj)
  }
}
