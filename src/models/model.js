// @flow

import { _ } from 'lodash/core'

import type { ID } from '../types'

export class Model {

  _id: ID
  
  constructor(arg : ID | Object) {
    if (typeof arg === 'string')
      this._id = arg
    else
      this.loadObject(arg)
  }


  loadObject(obj: Object) {
    Object.assign(this, obj)
    return this
  }
}
