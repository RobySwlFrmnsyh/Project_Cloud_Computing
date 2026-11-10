import { config } from '../config.js'
import { HttpError } from '../lib/http.js'
import { verifySession } from '../lib/session.js'
import { findUserById } from '../services/users.js'

const PASSWORD_CHANGE_PATHS = new Set([
  '/api/auth/me',
  '/api/auth/logout',
  '/api/users/me',
  '/api/users/me/password',
])

function requestPath(req) {
  return (req.originalUrl ?? '').split('?')[0]
}

function readToken(req) {
  const cookieToken = req.cookies?.[config.cookieName]
  if (cookieToken) return cookieToken

  const header = req.get('authorization')
  if (header?.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim()
  }

  return null
}

export async function loadUser(req) {
  const token = readToken(req)
  if (!token) return null

  let payload
  try {
    payload = verifySession(token)
  } catch {
    return null
  }

  return findUserById(payload.sub)
}

export async function authenticate(req, _res, next) {
  try {
    const user = await loadUser(req)

    if (!user) {
      throw new HttpError(401, 'Sesi tidak valid atau sudah berakhir. Silakan masuk kembali.')
    }

    if (user.role === 'driver') {
      const status = user.vehicle?.verification_status
      if (status === 'pending') {
        throw new HttpError(403, 'Akun driver masih menunggu verifikasi admin.')
      }
      if (status === 'rejected' || !status) {
        throw new HttpError(403, 'Verifikasi driver ditolak. Hubungi admin untuk tindak lanjut.')
      }
    }

    if (user.must_change_password && !PASSWORD_CHANGE_PATHS.has(requestPath(req))) {
      throw new HttpError(
        403,
        'Kata sandi sementara harus diganti sebelum mengakses fitur lain.',
      )
    }

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Silakan masuk terlebih dahulu.'))
    }
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Kamu tidak memiliki akses ke aksi ini.'))
    }
    next()
  }
}
