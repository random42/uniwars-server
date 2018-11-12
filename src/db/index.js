// @flow
import _ from 'lodash'

import * as utils from './utils'
import * as OPTIONS from './options'

/**
 * Takes some predefined options' strings and returns an options object
 * to be passed to MongoDB crud functions.
 *
 * @param options Constants names (which can be found in options file)
 * @param mergeWith Object with additional options to merge.
 * @return MongoDB options object.
 */
export function dbOptions(options : string[], mergeWith: Object = {}) : Object {
  const objects : Object[] = options.map(o => OPTIONS[o])
  return _.merge({}, ...objects, mergeWith)
}
export { DB } from './db'
