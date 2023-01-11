exports.ErrorHandler = (message, statusCode) => {
  const err = new Error(message)
  err.status = statusCode
  throw err
}
