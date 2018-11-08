// @flow
import monk from 'monk'
import type { ID } from '../types'

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


  loadObject(obj: Object) {
    Object.assign(this, obj)
  }
}
