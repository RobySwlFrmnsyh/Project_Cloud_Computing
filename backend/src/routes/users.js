import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { query } from '../db/pool.js'
import { asyncHandler, HttpError } from '../lib/http.js'
import { parse } from '../lib/validate.js'
import { passwordSchema, profileSchema, userListQuerySchema } from '../lib/schemas.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { findUserById, listUsersPage } from '../services/users.js'

const router = Router()

router.use(authenticate)

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ success: true, message: 'Data pengguna aktif.', data: { user: req.user } })
  }),
)

router.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const data = parse(profileSchema, req.body)

    await query('UPDATE users SET name = $1, phone = $2 WHERE id = $3', [
      data.name,
      data.phone,
      req.user.id,
    ])

    const user = await findUserById(req.user.id)
    res.json({ success: true, message: 'Profil berhasil diperbarui.', data: { user } })
  }),
)

router.patch(
  '/me/password',
  asyncHandler(async (req, res) => {
    const data = parse(passwordSchema, req.body)

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    if (result.rowCount === 0) {
      throw new HttpError(404, 'Akun tidak ditemukan.')
    }

    const matches = await bcrypt.compare(data.currentPassword, result.rows[0].password_hash)
    if (!matches) {
      throw new HttpError(422, 'Kata sandi saat ini tidak cocok.', {
        currentPassword: 'Kata sandi saat ini tidak cocok.',
      })
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10)
    await query(
      `UPDATE users
       SET password_hash = $1, must_change_password = false
       WHERE id = $2`,
      [passwordHash, req.user.id],
    )

    const user = await findUserById(req.user.id)
    res.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui.',
      data: { user },
    })
  }),
)

router.get(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const filters = parse(userListQuerySchema, req.query)
    const { users, pagination } = await listUsersPage(filters)
    res.json({
      success: true,
      message: 'Daftar pengguna.',
      data: pagination ? { users, pagination } : { users },
    })
  }),
)

export default router
