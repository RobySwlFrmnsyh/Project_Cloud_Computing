import { query } from '../db/pool.js'
import { serializeNotification } from '../lib/serializers.js'
import { publishNotification } from '../lib/realtime.js'

const NOTIFICATION_SELECT = `
  SELECT n.*, b.code AS booking_code
  FROM notifications n
  LEFT JOIN bookings b ON b.id = n.booking_id
`

export async function createNotification({
  userId,
  type,
  title,
  message,
  bookingId = null,
}) {
  if (!userId) return null

  const inserted = await query(
    `INSERT INTO notifications (user_id, booking_id, type, title, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, bookingId, type, title, message],
  )

  const result = await query(`${NOTIFICATION_SELECT} WHERE n.id = $1`, [
    inserted.rows[0].id,
  ])
  const notification = serializeNotification(result.rows[0])
  publishNotification(String(userId), notification)
  return notification
}

export async function notifyAvailableDrivers(booking) {
  if (!booking || booking.status !== 'pending' || booking.driver_id) return []

  const drivers = await query(
    `SELECT u.id
     FROM users u
     JOIN driver_profiles dp ON dp.user_id = u.id
     WHERE u.role = 'driver'
       AND dp.verification_status = 'approved'
       AND dp.availability_status = 'online'
       AND dp.vehicle_type = $1`,
    [booking.vehicle_type],
  )

  return Promise.all(
    drivers.rows.map((driver) =>
      createNotification({
        userId: driver.id,
        bookingId: booking.db_id,
        type: 'booking_available',
        title: 'Pesanan baru tersedia',
        message: `${booking.id} dari ${booking.pickup_location} ke ${booking.destination}.`,
      }),
    ),
  )
}

export async function notifyBookingParticipants(booking, payload) {
  if (!booking) return []

  const tasks = []
  if (payload.customer !== false) {
    tasks.push(
      createNotification({
        userId: booking.customer_id,
        bookingId: booking.db_id,
        type: payload.type,
        title: payload.title,
        message:
          typeof payload.customerMessage === 'function'
            ? payload.customerMessage(booking)
            : (payload.customerMessage ?? payload.message),
      }),
    )
  }
  if (payload.driver !== false && booking.driver_id) {
    tasks.push(
      createNotification({
        userId: booking.driver_id,
        bookingId: booking.db_id,
        type: payload.type,
        title: payload.title,
        message:
          typeof payload.driverMessage === 'function'
            ? payload.driverMessage(booking)
            : (payload.driverMessage ?? payload.message),
      }),
    )
  }
  return Promise.all(tasks)
}

export async function listNotificationsFor(userId, { page = 1, limit = 30, unread = false } = {}) {
  const where = unread
    ? 'WHERE n.user_id = $1 AND n.read_at IS NULL'
    : 'WHERE n.user_id = $1'
  const offset = (page - 1) * limit

  const [rows, count, unreadCount] = await Promise.all([
    query(
      `${NOTIFICATION_SELECT}
       ${where}
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    query(
      `SELECT COUNT(*)::int AS total FROM notifications n ${where}`,
      [userId],
    ),
    query(
      'SELECT COUNT(*)::int AS total FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [userId],
    ),
  ])
  const total = count.rows[0].total

  return {
    notifications: rows.rows.map(serializeNotification),
    unread: unreadCount.rows[0].total,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  }
}

export async function markNotificationRead(userId, notificationId) {
  const result = await query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, now())
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId],
  )

  if (result.rowCount === 0) return null
  const row = await query(`${NOTIFICATION_SELECT} WHERE n.id = $1`, [notificationId])
  return serializeNotification(row.rows[0])
}

export async function markAllNotificationsRead(userId) {
  const result = await query(
    `UPDATE notifications
     SET read_at = now()
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  )
  return result.rowCount
}
