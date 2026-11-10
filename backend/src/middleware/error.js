import { ZodError } from 'zod'
import { HttpError } from '../lib/http.js'

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`))
}

export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return

  let statusCode = 500
  let message = 'Terjadi kesalahan pada server.'
  let errors = null

  if (error instanceof HttpError) {
    statusCode = error.statusCode
    message = error.message
    errors = error.errors
  } else if (error instanceof ZodError) {
    statusCode = 422
    message = 'Data yang dikirim belum valid.'
    errors = {}
    for (const issue of error.issues) {
      const field = issue.path.length > 0 ? issue.path.join('.') : '_'
      if (!errors[field]) errors[field] = issue.message
    }
  } else if (error?.type === 'entity.parse.failed') {
    statusCode = 400
    message = 'Body JSON tidak valid.'
  } else if (error?.code === '23505') {
    statusCode = 409
    message = 'Data sudah digunakan. Periksa kembali isian kamu.'
  } else if (error?.code === '23503') {
    statusCode = 400
    message = 'Data referensi tidak ditemukan atau masih dipakai.'
  } else if (error?.code === '23514' || error?.code === '22P02') {
    statusCode = 400
    message = 'Data yang dikirim tidak sesuai format.'
  }

  if (statusCode >= 500) {
    console.error('[api] kesalahan server:', error)
  }

  const body = { success: false, message }
  if (errors) body.errors = errors
  res.status(statusCode).json(body)
}
