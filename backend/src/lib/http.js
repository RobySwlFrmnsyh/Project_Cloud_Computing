export class HttpError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.errors = errors
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

export function notFound(message = 'Endpoint tidak ditemukan.') {
  return new HttpError(404, message)
}
