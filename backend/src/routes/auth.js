import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { withTransaction } from '../db/pool.js'
import { asyncHandler, HttpError } from '../lib/http.js'
import { loginSchema, registerSchema } from '../lib/schemas.js'
import { clearSessionCookie, setSessionCookie, signSession } from '../lib/session.js'
import { parse } from '../lib/validate.js'
import { authenticate } from '../middleware/auth.js'
import { findUserById, findUserCredentialsByEmail } from '../services/users.js'

const router = Router()

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = parse(registerSchema, req.body)
    const passwordHash = await bcrypt.hash(data.password, 10)

    let userId
    try {
      userId = await withTransaction(async (client) => {
        const inserted = await client.query(
          `INSERT INTO users (name, email, password_hash, phone, role)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [data.name, data.email, passwordHash, data.phone, data.role],
        )

        const id = inserted.rows[0].id

        if (data.role === 'driver') {
          await client.query(
            `INSERT INTO driver_profiles
              (user_id, vehicle_type, vehicle_plate, verification_status, availability_status)
             VALUES ($1, $2, $3, 'pending', 'offline')`,
            [id, data.vehicleType, data.plate.trim().toUpperCase()],
          )
        }

        return id
      })
    } catch (error) {
      if (error?.code === '23505') {
        throw new HttpError(409, 'Email sudah digunakan. Gunakan email lain atau masuk ke akun.')
      }
      throw error
    }

    const user = await findUserById(userId)

    res.status(201).json({
      success: true,
      message:
        user.role === 'driver'
          ? 'Pendaftaran driver terkirim. Akun menunggu verifikasi admin.'
          : 'Akun berhasil dibuat. Silakan masuk dengan akun baru.',
      data: { user },
    })
  }),
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = parse(loginSchema, req.body)
    const credentials = await findUserCredentialsByEmail(data.email)

    if (!credentials) {
      throw new HttpError(401, 'Email atau kata sandi salah.')
    }

    const matches = await bcrypt.compare(data.password, credentials.password_hash)
    if (!matches) {
      throw new HttpError(401, 'Email atau kata sandi salah.')
    }

    const user = await findUserById(credentials.id)
    if (!user) {
      throw new HttpError(401, 'Akun tidak ditemukan.')
    }

    if (user.role === 'driver') {
      const status = user.vehicle?.verification_status
      if (status === 'pending') {
        throw new HttpError(403, 'Akun driver masih menunggu verifikasi admin.')
      }
      if (status === 'rejected' || !status) {
        throw new HttpError(
          403,
          'Verifikasi driver ditolak. Hubungi admin untuk tindak lanjut.',
        )
      }
    }

    setSessionCookie(res, signSession(user))

    res.json({
      success: true,
      message: `Selamat datang, ${user.name}.`,
      data: { user },
    })
  }),
)

router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    clearSessionCookie(res)
    res.json({ success: true, message: 'Sesi berhasil diakhiri.', data: null })
  }),
)

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, message: 'Sesi aktif.', data: { user: req.user } })
  }),
)

export default router
