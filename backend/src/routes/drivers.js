import { Router } from 'express'
import { query } from '../db/pool.js'
import { asyncHandler, HttpError } from '../lib/http.js'
import { availabilitySchema, verificationSchema } from '../lib/schemas.js'
import { parse } from '../lib/validate.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { findUserById, listUsers } from '../services/users.js'

const router = Router()

router.use(authenticate)

router.get(
  '/',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const drivers = await listUsers({ role: 'driver' })
    res.json({ success: true, message: 'Daftar driver.', data: { drivers } })
  }),
)

router.patch(
  '/me/availability',
  requireRole('driver'),
  asyncHandler(async (req, res) => {
    const data = parse(availabilitySchema, req.body)

    if (req.user.vehicle?.verification_status !== 'approved') {
      throw new HttpError(403, 'Akun driver belum diverifikasi admin.')
    }

    await query(
      `UPDATE driver_profiles
       SET availability_status = $1, updated_at = now()
       WHERE user_id = $2`,
      [data.availability, req.user.id],
    )

    const user = await findUserById(req.user.id)
    res.json({
      success: true,
      message:
        data.availability === 'online'
          ? 'Kamu sekarang online dan siap menerima pesanan.'
          : 'Kamu sekarang offline.',
      data: { user },
    })
  }),
)

router.patch(
  '/:userId/verification',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = parse(verificationSchema, req.body)

    if (!/^\d+$/.test(req.params.userId)) {
      throw new HttpError(404, 'Driver tidak ditemukan.')
    }

    const existing = await query(
      `SELECT u.role, dp.id
       FROM users u
       LEFT JOIN driver_profiles dp ON dp.user_id = u.id
       WHERE u.id = $1`,
      [req.params.userId],
    )

    if (existing.rowCount === 0 || existing.rows[0].role !== 'driver') {
      throw new HttpError(404, 'Driver tidak ditemukan.')
    }

    await query(
      `UPDATE driver_profiles
       SET verification_status = $1,
           availability_status = CASE WHEN $1 = 'approved' THEN availability_status ELSE 'offline' END,
           verified_at = CASE WHEN $1 = 'approved' THEN now() ELSE NULL END,
           updated_at = now()
       WHERE user_id = $2`,
      [data.status, req.params.userId],
    )

    const user = await findUserById(req.params.userId)
    res.json({
      success: true,
      message:
        data.status === 'approved'
          ? `Driver ${user.name} disetujui.`
          : `Verifikasi driver ${user.name} ditolak.`,
      data: { user },
    })
  }),
)

export default router
