export function debugRequest(req, res, next) {
  console.log(req.method, req.ip, req.path)
  console.log('\ndata:\n', req.data)
  console.log('\nparams:\n', req.params)
  console.log('\nquery:\n', req.query)
  next()
}
