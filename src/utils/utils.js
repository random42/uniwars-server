// @flow

import _ from 'lodash'


/**
 * isAsync - description
 */
export function isAsync(fn : () => any) : boolean {
 return fn.constructor.name === 'AsyncFunction';
}

/**
 * Merge each array object with his counterpart.
 *
 * @param arr1
 * @param arr2
 * @param field Field to put the second object in, otherwise objects are merged
 */
export function mergeArraysById(
  arr1 : Object[],
  arr2 : Object[],
  field? : string
  ) : Object[] {
  let out = []
  arr1.forEach(obj => {
    let counter = _.find(arr2, { _id: obj._id })
    if (!field) {
      out.push({...obj, ...counter})
    }
    else {
      let a = {...obj}
      a[field] = {...counter, _id: undefined}
      out.push(a)
    }
  })
  return out
}

/**
 * Modify object/array by converting objectIDs to strings.
 */
export function stringifyIds(obj : Object) {
  // primitive types
  if (typeof obj !== 'object') return
  // object/array
  for (let i in obj) {
    if (isObjectId(obj[i]))
      obj[i] = obj[i].toString()
    else stringifyIds(obj[i])
  }
}

export function isObjectId(obj : Object) : boolean {
  return typeof obj === 'object' &&
    obj !== null &&
    obj.constructor &&
    obj.constructor.name === 'ObjectID'
}

export default module.exports
