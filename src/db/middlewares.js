import utils from '../utils'

export const stringifyIds = ({collection, monkInstance}) => next => (args, method) => {
  return next(args, method).then(res => {
    return utils.stringifyIds(res)
  })
}
