export function logRequest(req, res, next) {
  console.log(req.params)
  console.log(req.query)
  console.log(req.body)
}
