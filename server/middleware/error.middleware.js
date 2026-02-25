const { ZodError } = require('zod')
const { HttpError } = require('../utils/http-error')

function notFoundHandler(_req, _res, next) {
  next(new HttpError(404, 'Route not found.'))
}

function errorHandler(error, _req, res, _next) {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'Uploaded file is too large.',
    })
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed.',
      details: error.issues,
    })
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    })
  }

  console.error(error)

  return res.status(500).json({
    error: 'Internal server error.',
  })
}

module.exports = {
  notFoundHandler,
  errorHandler,
}
