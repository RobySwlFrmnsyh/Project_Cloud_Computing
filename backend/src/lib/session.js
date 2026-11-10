import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export function signSession(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn,
    issuer: 'anter-jemput-teman',
  })
}

export function verifySession(token) {
  return jwt.verify(token, config.jwtSecret, { issuer: 'anter-jemput-teman' })
}

export function setSessionCookie(res, token) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
  })
}

export function clearSessionCookie(res) {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
  })
}
