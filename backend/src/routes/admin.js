import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { config } from '../config.js'
import { withTransaction } from '../db/pool.js'
import { seedDemoData } from '../db/seed.js'
import { asyncHandler, HttpError } from '../lib/http.js'
import { generateTemporaryPassword } from '../lib/passwords.js'
import { publishBookingDeleted } from '../lib/realtime.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

const ACTIVE_STATUSES = ['pending', 'accepted', 'arrived', 'in_progress']
const MANAGED_ROLES = new Set(['customer', 'driver'])

router.use(authenticate, requireRole('admin'))

function accountId(value) {
  if (!/^\d+$/.test(String(value))) {
    throw new HttpError(404, 'Akun tidak ditemukan.')
  }
  return value
}

async function loadManagedAccount(client, userId) {
  const result = await client.query(
    'SELECT id, name, email, role FROM users WHERE id = $1 FOR UPDATE',
    [userId],
  )

  const user = result.rows[0]
  if (!user) throw new HttpError(404, 'Akun tidak ditemukan.')
  if (!MANAGED_ROLES.has(user.role)) {
    throw new HttpError(403, 'Akun admin tidak dapat dikelola dari dashboard.')
  }

  return user
}

async function ensureNoActiveBookings(client, user) {
  const column = user.role === 'customer' ? 'customer_id' : 'driver_id'
  const result = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM bookings
     WHERE ${column} = $1 AND status = ANY($2::text[])`,
    [user.id, ACTIVE_STATUSES],
  )

  if (result.rows[0].total > 0) {
    throw new HttpError(
      409,
      'Selesaikan atau batalkan pesanan aktif akun ini sebelum reset atau menghapus akun.',
    )
  }
}

async function resetAccountData(client, user) {
  if (user.role === 'customer') {
    const bookings = await client.query(
      `SELECT code AS id, customer_id, driver_id, vehicle_type
       FROM bookings
       WHERE customer_id = $1`,
      [user.id],
    )

    const notifications = await client.query(
      `DELETE FROM notifications
       WHERE user_id = $1
          OR booking_id IN (SELECT id FROM bookings WHERE customer_id = $1)`,
      [user.id],
    )

    await client.query('DELETE FROM bookings WHERE customer_id = $1', [user.id])

    return {
      bookings_deleted: bookings.rowCount,
      notifications_deleted: notifications.rowCount,
      deletedBookings: bookings.rows,
    }
  }

  const released = await client.query(
    `UPDATE bookings
     SET driver_id = NULL, updated_at = now()
     WHERE driver_id = $1
     RETURNING code`,
    [user.id],
  )

  const declines = await client.query('DELETE FROM booking_declines WHERE driver_id = $1', [
    user.id,
  ])
  const locations = await client.query('DELETE FROM driver_locations WHERE driver_id = $1', [
    user.id,
  ])
  const notifications = await client.query('DELETE FROM notifications WHERE user_id = $1', [
    user.id,
  ])

  await client.query(
    `UPDATE driver_profiles
     SET verification_status = 'pending',
         availability_status = 'offline',
         rating = 0,
         total_trips = 0,
         verified_at = NULL,
         updated_at = now()
     WHERE user_id = $1`,
    [user.id],
  )

  return {
    bookings_released: released.rowCount,
    declines_deleted: declines.rowCount,
    locations_deleted: locations.rowCount,
    notifications_deleted: notifications.rowCount,
    deletedBookings: [],
  }
}

router.post(
  '/reset-demo',
  asyncHandler(async (_req, res) => {
    if (!config.allowDemoReset) {
      throw new HttpError(403, 'Reset data demo dinonaktifkan pada server ini.')
    }

    const result = await seedDemoData({ force: true })

    res.json({
      success: true,
      message: 'Data demo berhasil direset ke kondisi awal.',
      data: result,
    })
  }),
)

router.post(
  '/users/:userId/reset-password',
  asyncHandler(async (req, res) => {
    const userId = accountId(req.params.userId)
    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await bcrypt.hash(temporaryPassword, 10)

    const user = await withTransaction(async (client) => {
      const account = await loadManagedAccount(client, userId)
      await client.query(
        `UPDATE users
         SET password_hash = $1, must_change_password = true
         WHERE id = $2`,
        [passwordHash, account.id],
      )
      return account
    })

    res.json({
      success: true,
      message: `Sandi sementara untuk ${user.name} berhasil dibuat.`,
      data: {
        user: {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        temporary_password: temporaryPassword,
      },
    })
  }),
)

router.post(
  '/users/:userId/reset',
  asyncHandler(async (req, res) => {
    const userId = accountId(req.params.userId)
    const { user, summary } = await withTransaction(async (client) => {
      const account = await loadManagedAccount(client, userId)
      await ensureNoActiveBookings(client, account)
      return { user: account, summary: await resetAccountData(client, account) }
    })

    for (const booking of summary.deletedBookings) {
      publishBookingDeleted(booking)
    }

    const detail =
      user.role === 'customer'
        ? `${summary.bookings_deleted} pesanan dan ${summary.notifications_deleted} notifikasi dihapus.`
        : `${summary.bookings_released} riwayat pesanan dilepas dan profil driver dikembalikan ke status awal.`

    res.json({
      success: true,
      message: `Data akun ${user.name} berhasil direset. ${detail}`,
      data: {
        user_id: String(user.id),
        role: user.role,
        bookings_deleted: summary.bookings_deleted ?? 0,
        bookings_released: summary.bookings_released ?? 0,
        notifications_deleted: summary.notifications_deleted,
      },
    })
  }),
)

router.delete(
  '/users/:userId',
  asyncHandler(async (req, res) => {
    const userId = accountId(req.params.userId)
    const { user, summary } = await withTransaction(async (client) => {
      const account = await loadManagedAccount(client, userId)
      await ensureNoActiveBookings(client, account)
      const data = await resetAccountData(client, account)
      await client.query('DELETE FROM users WHERE id = $1', [account.id])
      return { user: account, summary: data }
    })

    for (const booking of summary.deletedBookings) {
      publishBookingDeleted(booking)
    }

    res.json({
      success: true,
      message: `Akun ${user.name} (${user.role}) dihapus permanen.`,
      data: {
        user_id: String(user.id),
        role: user.role,
        bookings_deleted: summary.bookings_deleted ?? 0,
        bookings_released: summary.bookings_released ?? 0,
        notifications_deleted: summary.notifications_deleted,
      },
    })
  }),
)

export default router
