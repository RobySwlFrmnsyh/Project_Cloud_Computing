import { Router } from 'express'
import { query, withTransaction } from '../db/pool.js'
import { estimateFare } from '../lib/fare.js'
import { asyncHandler, HttpError } from '../lib/http.js'
import { resolveRoute } from '../lib/routing.js'
import {
  bookingListQuerySchema,
  bookingStatusSchema,
  createBookingSchema,
  paymentConfirmSchema,
  paymentCreateSchema,
  ratingSchema,
  updateBookingSchema,
} from '../lib/schemas.js'
import { parse } from '../lib/validate.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import {
  publishBookingDeclined,
  publishBookingDeleted,
  publishBookingUnavailable,
  publishBookingUpdated,
} from '../lib/realtime.js'
import {
  canViewBooking,
  getBookingByCode,
  listBookingsFor,
} from '../services/bookings.js'
import {
  createNotification,
  notifyAvailableDrivers,
  notifyBookingParticipants,
} from '../services/notifications.js'

const router = Router()

const CANCELLABLE = ['pending', 'accepted', 'arrived']
const NEXT_STATUS = {
  accepted: 'arrived',
  arrived: 'in_progress',
  in_progress: 'completed',
}
const STATUS_NOTIFICATIONS = {
  arrived: {
    title: 'Driver sudah tiba',
    message: (booking) => `Driver sudah tiba di titik jemput ${booking.id}.`,
  },
  in_progress: {
    title: 'Perjalanan dimulai',
    message: (booking) => `Perjalanan ${booking.id} sedang berlangsung.`,
  },
  completed: {
    title: 'Perjalanan selesai',
    message: (booking) => `Perjalanan ${booking.id} selesai. Jangan lupa beri rating.`,
  },
}

function normalizeCode(code) {
  return String(code).trim().toUpperCase()
}

async function loadBooking(code) {
  const booking = await getBookingByCode(normalizeCode(code))
  if (!booking) throw new HttpError(404, 'Pesanan tidak ditemukan.')
  return booking
}

function ensureVisible(user, booking) {
  if (!canViewBooking(user, booking)) {
    throw new HttpError(404, 'Pesanan tidak ditemukan.')
  }
}

function ensureCustomerOwner(user, booking) {
  if (booking.customer_id !== user.id) {
    throw new HttpError(403, 'Pesanan ini bukan milik akunmu.')
  }
}

router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = parse(bookingListQuerySchema, req.query)
    const { bookings, pagination } = await listBookingsFor(req.user, filters)
    res.json({
      success: true,
      message: 'Daftar pesanan sesuai hak akses.',
      data: pagination ? { bookings, pagination } : { bookings },
    })
  }),
)

router.post(
  '/',
  requireRole('customer'),
  asyncHandler(async (req, res) => {
    const data = parse(createBookingSchema, req.body)
    const route = await resolveRoute(data.pickup, data.destination)
    const fare = estimateFare(route.distanceKm, data.vehicle_type).total

    const inserted = await query(
      `INSERT INTO bookings
        (customer_id, vehicle_type, pickup_address, pickup_latitude, pickup_longitude,
         destination_address, destination_latitude, destination_longitude,
         distance_km, route_duration_minutes, route_geometry, route_provider,
         scheduled_at, estimated_fare, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING code`,
      [
        req.user.id,
        data.vehicle_type,
        data.pickup.address,
        data.pickup.lat,
        data.pickup.lng,
        data.destination.address,
        data.destination.lat,
        data.destination.lng,
        route.distanceKm,
        route.durationMinutes,
        JSON.stringify(route.geometry),
        route.provider,
        data.scheduled_at,
        fare,
        data.notes,
      ],
    )

    const booking = await getBookingByCode(inserted.rows[0].code)
    publishBookingUpdated(booking, { available: true })
    await Promise.all([
      createNotification({
        userId: booking.customer_id,
        bookingId: booking.db_id,
        type: 'booking_created',
        title: 'Pesanan dibuat',
        message: `Pesanan ${booking.id} sedang mencari driver.`,
      }),
      notifyAvailableDrivers(booking),
    ])

    res.status(201).json({
      success: true,
      message: `Pesanan ${booking.id} berhasil dibuat dan menunggu driver.`,
      data: { booking },
    })
  }),
)

router.get(
  '/:code',
  asyncHandler(async (req, res) => {
    const booking = await loadBooking(req.params.code)
    ensureVisible(req.user, booking)
    res.json({
      success: true,
      message: 'Detail pesanan.',
      data: { booking },
    })
  }),
)

router.put(
  '/:code',
  requireRole('customer'),
  asyncHandler(async (req, res) => {
    const data = parse(updateBookingSchema, req.body)
    const booking = await loadBooking(req.params.code)
    ensureCustomerOwner(req.user, booking)

    if (booking.driver_id || booking.status !== 'pending') {
      throw new HttpError(409, 'Pesanan hanya dapat diubah sebelum diterima driver.')
    }

    const route = await resolveRoute(data.pickup, data.destination)
    const fare = estimateFare(route.distanceKm, data.vehicle_type).total

    await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE bookings
         SET vehicle_type = $1,
             pickup_address = $2,
             pickup_latitude = $3,
             pickup_longitude = $4,
             pickup_location_id = NULL,
             destination_address = $5,
             destination_latitude = $6,
             destination_longitude = $7,
             destination_location_id = NULL,
             distance_km = $8,
             route_duration_minutes = $9,
             route_geometry = $10,
             route_provider = $11,
             scheduled_at = $12,
             estimated_fare = $13,
             notes = $14,
             updated_at = now()
         WHERE code = $15
           AND status = 'pending'
           AND driver_id IS NULL
           AND customer_id = $16
         RETURNING id`,
        [
          data.vehicle_type,
          data.pickup.address,
          data.pickup.lat,
          data.pickup.lng,
          data.destination.address,
          data.destination.lat,
          data.destination.lng,
          route.distanceKm,
          route.durationMinutes,
          JSON.stringify(route.geometry),
          route.provider,
          data.scheduled_at,
          fare,
          data.notes,
          booking.id,
          req.user.id,
        ],
      )

      if (updated.rowCount === 0) {
        throw new HttpError(409, 'Pesanan sudah berubah. Muat ulang halaman.')
      }

      await client.query('DELETE FROM booking_declines WHERE booking_id = $1', [
        updated.rows[0].id,
      ])
    })

    const fresh = await getBookingByCode(booking.id)
    if (fresh.vehicle_type !== booking.vehicle_type) {
      publishBookingUnavailable(booking)
    }
    publishBookingUpdated(fresh, { available: true })

    res.json({
      success: true,
      message: `Pesanan ${fresh.id} berhasil diperbarui.`,
      data: { booking: fresh },
    })
  }),
)

router.get(
  '/:code/location',
  asyncHandler(async (req, res) => {
    const booking = await loadBooking(req.params.code)
    ensureVisible(req.user, booking)

    if (!booking.driver_location) {
      throw new HttpError(404, 'Lokasi driver belum tersedia.')
    }

    res.json({
      success: true,
      message: 'Lokasi driver terakhir.',
      data: { location: booking.driver_location },
    })
  }),
)

router.post(
  '/:code/accept',
  requireRole('driver'),
  asyncHandler(async (req, res) => {
    const booking = await loadBooking(req.params.code)
    const vehicle = req.user.vehicle

    if (vehicle?.verification_status !== 'approved') {
      throw new HttpError(403, 'Akun driver belum diverifikasi admin.')
    }
    if (vehicle.availability_status !== 'online') {
      throw new HttpError(409, 'Aktifkan status online sebelum menerima pesanan.')
    }
    if (booking.driver_id && booking.driver_id !== req.user.id) {
      throw new HttpError(409, 'Pesanan sudah diterima driver lain.')
    }
    if (booking.status !== 'pending') {
      throw new HttpError(409, 'Pesanan ini sudah tidak tersedia.')
    }
    if (booking.vehicle_type !== vehicle.type) {
      throw new HttpError(409, 'Jenis kendaraanmu tidak sesuai dengan pesanan ini.')
    }

    const updated = await query(
      `UPDATE bookings
       SET driver_id = $1, status = 'accepted', updated_at = now()
       WHERE code = $2 AND status = 'pending' AND driver_id IS NULL
       RETURNING code`,
      [req.user.id, booking.id],
    )

    if (updated.rowCount === 0) {
      throw new HttpError(409, 'Pesanan sudah diambil driver lain. Muat ulang daftar.')
    }

    const fresh = await getBookingByCode(booking.id)
    publishBookingUpdated(fresh)
    publishBookingUnavailable(fresh)
    await createNotification({
      userId: fresh.customer_id,
      bookingId: fresh.db_id,
      type: 'booking_accepted',
      title: 'Driver menerima pesanan',
      message: `${req.user.name} menerima pesanan ${fresh.id}.`,
    })

    res.json({
      success: true,
      message: `Pesanan ${booking.id} berhasil kamu terima.`,
      data: { booking: fresh },
    })
  }),
)

router.post(
  '/:code/decline',
  requireRole('driver'),
  asyncHandler(async (req, res) => {
    const booking = await loadBooking(req.params.code)
    const vehicle = req.user.vehicle

    if (vehicle?.verification_status !== 'approved') {
      throw new HttpError(403, 'Akun driver belum diverifikasi admin.')
    }
    if (booking.status !== 'pending' || booking.driver_id) {
      throw new HttpError(409, 'Pesanan ini sudah tidak tersedia.')
    }
    if (booking.vehicle_type !== vehicle.type) {
      throw new HttpError(409, 'Jenis kendaraanmu tidak sesuai dengan pesanan ini.')
    }

    await query(
      `INSERT INTO booking_declines (booking_id, driver_id)
       VALUES ($1, $2)
       ON CONFLICT (booking_id, driver_id) DO NOTHING`,
      [booking.db_id, req.user.id],
    )

    publishBookingDeclined(booking, req.user.id)

    res.json({
      success: true,
      message: `Pesanan ${booking.id} disembunyikan dari daftarmu.`,
      data: { code: booking.id },
    })
  }),
)

router.patch(
  '/:code/status',
  requireRole('driver'),
  asyncHandler(async (req, res) => {
    const data = parse(bookingStatusSchema, req.body)
    const booking = await loadBooking(req.params.code)

    if (booking.driver_id !== req.user.id) {
      throw new HttpError(403, 'Pesanan ini bukan tugasmu.')
    }

    const expected = NEXT_STATUS[booking.status]
    if (expected !== data.status) {
      throw new HttpError(
        409,
        `Status tidak dapat diubah dari ${booking.status} ke ${data.status}.`,
      )
    }

    await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE bookings
         SET status = $1, updated_at = now()
         WHERE code = $2 AND driver_id = $3 AND status = $4
         RETURNING id`,
        [data.status, booking.id, req.user.id, booking.status],
      )

      if (updated.rowCount === 0) {
        throw new HttpError(409, 'Status pesanan sudah berubah. Muat ulang halaman.')
      }

      if (data.status === 'completed') {
        await client.query(
          `UPDATE driver_profiles
           SET total_trips = total_trips + 1, updated_at = now()
           WHERE user_id = $1`,
          [req.user.id],
        )
      }
    })

    const fresh = await getBookingByCode(booking.id)
    publishBookingUpdated(fresh)
    const statusMessage = STATUS_NOTIFICATIONS[data.status]
    if (statusMessage) {
      await createNotification({
        userId: fresh.customer_id,
        bookingId: fresh.db_id,
        type: `booking_${data.status}`,
        title: statusMessage.title,
        message: statusMessage.message(fresh),
      })
    }

    res.json({
      success: true,
      message: `Status ${booking.id} diperbarui menjadi ${data.status}.`,
      data: { booking: fresh },
    })
  }),
)

router.post(
  '/:code/rating',
  requireRole('customer'),
  asyncHandler(async (req, res) => {
    const data = parse(ratingSchema, req.body)
    const booking = await loadBooking(req.params.code)
    ensureCustomerOwner(req.user, booking)

    if (booking.status !== 'completed' || !booking.driver_id) {
      throw new HttpError(409, 'Rating hanya dapat diberikan setelah perjalanan selesai.')
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE bookings
         SET rating = $1,
             rating_comment = $2,
             rated_at = now(),
             updated_at = now()
         WHERE code = $3 AND customer_id = $4 AND status = 'completed'`,
        [data.rating, data.comment || null, booking.id, req.user.id],
      )

      await client.query(
        `UPDATE driver_profiles
         SET rating = COALESCE((
               SELECT ROUND(AVG(b.rating)::numeric, 1)
               FROM bookings b
               WHERE b.driver_id = $1 AND b.rating IS NOT NULL
             ), 0),
             updated_at = now()
         WHERE user_id = $1`,
        [booking.driver_id],
      )
    })

    const fresh = await getBookingByCode(booking.id)
    publishBookingUpdated(fresh)
    await createNotification({
      userId: fresh.driver_id,
      bookingId: fresh.db_id,
      type: 'booking_rated',
      title: 'Rating baru diterima',
      message: `Customer memberi rating ${data.rating} untuk pesanan ${fresh.id}.`,
    })

    res.json({
      success: true,
      message: 'Rating berhasil disimpan.',
      data: { booking: fresh },
    })
  }),
)

router.post(
  '/:code/cancel',
  asyncHandler(async (req, res) => {
    const booking = await loadBooking(req.params.code)

    if (req.user.role === 'admin') {
      // Admin boleh membatalkan pesanan aktif mana pun.
    } else if (req.user.role === 'customer') {
      ensureCustomerOwner(req.user, booking)
    } else {
      throw new HttpError(403, 'Driver tidak dapat membatalkan pesanan customer.')
    }

    if (!CANCELLABLE.includes(booking.status)) {
      throw new HttpError(
        409,
        'Pesanan hanya dapat dibatalkan sebelum perjalanan dimulai.',
      )
    }

    await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE bookings
         SET status = 'cancelled', updated_at = now()
         WHERE code = $1 AND status = ANY($2::text[])
         RETURNING id`,
        [booking.id, CANCELLABLE],
      )

      if (updated.rowCount === 0) {
        throw new HttpError(409, 'Pesanan sudah tidak dapat dibatalkan.')
      }

      await client.query(
        `UPDATE payments
         SET status = 'failed', updated_at = now()
         WHERE booking_id = $1 AND status = 'pending'`,
        [updated.rows[0].id],
      )

      await client.query(
        `UPDATE bookings
         SET payment_status = CASE WHEN payment_status = 'pending' THEN 'failed' ELSE payment_status END,
             updated_at = now()
         WHERE id = $1`,
        [updated.rows[0].id],
      )
    })

    const fresh = await getBookingByCode(booking.id)
    publishBookingUpdated(fresh)
    if (booking.status === 'pending' && !booking.driver_id) {
      publishBookingUnavailable(booking)
    }

    const cancelTasks = []
    if (req.user.role !== 'customer') {
      cancelTasks.push(
        createNotification({
          userId: fresh.customer_id,
          bookingId: fresh.db_id,
          type: 'booking_cancelled',
          title: 'Pesanan dibatalkan',
          message: `Pesanan ${fresh.id} dibatalkan oleh admin.`,
        }),
      )
    }
    if (req.user.role !== 'driver' && fresh.driver_id) {
      cancelTasks.push(
        createNotification({
          userId: fresh.driver_id,
          bookingId: fresh.db_id,
          type: 'booking_cancelled',
          title: 'Pesanan dibatalkan',
          message: `Pesanan ${fresh.id} dibatalkan oleh customer.`,
        }),
      )
    }
    await Promise.all(cancelTasks)

    res.json({
      success: true,
      message: `Pesanan ${booking.id} dibatalkan.`,
      data: { booking: fresh },
    })
  }),
)

router.delete(
  '/:code',
  asyncHandler(async (req, res) => {
    const booking = await loadBooking(req.params.code)

    if (req.user.role === 'admin') {
      // Admin boleh menghapus pesanan yang sudah dibatalkan.
    } else if (req.user.role === 'customer') {
      ensureCustomerOwner(req.user, booking)
    } else {
      throw new HttpError(403, 'Driver tidak dapat menghapus pesanan customer.')
    }

    if (booking.status !== 'cancelled') {
      throw new HttpError(
        409,
        'Hanya pesanan yang sudah dibatalkan yang dapat dihapus permanen.',
      )
    }

    const deleted = await query(
      `DELETE FROM bookings
       WHERE code = $1 AND status = 'cancelled'
       RETURNING code`,
      [booking.id],
    )

    if (deleted.rowCount === 0) {
      throw new HttpError(409, 'Pesanan tidak dapat dihapus karena statusnya berubah.')
    }

    publishBookingDeleted(booking)

    res.json({
      success: true,
      message: `Pesanan ${booking.id} dihapus permanen.`,
      data: { code: booking.id },
    })
  }),
)

router.get(
  '/:code/payment',
  asyncHandler(async (req, res) => {
    const booking = await loadBooking(req.params.code)
    ensureVisible(req.user, booking)

    if (!booking.payment) {
      throw new HttpError(404, 'Pembayaran untuk pesanan ini belum dibuat.')
    }

    res.json({
      success: true,
      message: 'Detail pembayaran.',
      data: { payment: booking.payment },
    })
  }),
)

router.post(
  '/:code/payment',
  asyncHandler(async (req, res) => {
    parse(paymentCreateSchema, req.body)
    const booking = await loadBooking(req.params.code)

    const isOwner = booking.customer_id === req.user.id
    const isAssignedDriver = booking.driver_id === req.user.id
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isAdmin && !isAssignedDriver) {
      throw new HttpError(403, 'Kamu tidak memiliki akses ke pembayaran ini.')
    }
    if (booking.status === 'cancelled') {
      throw new HttpError(409, 'Pesanan yang dibatalkan tidak dapat dibayar.')
    }
    if (booking.status !== 'completed') {
      throw new HttpError(409, 'Pembayaran dapat dilakukan setelah perjalanan selesai.')
    }
    if (booking.payment_status === 'paid') {
      throw new HttpError(409, 'Pembayaran pesanan ini sudah lunas.')
    }

    const raw = await query(
      'SELECT id, estimated_fare FROM bookings WHERE code = $1',
      [booking.id],
    )
    const bookingRow = raw.rows[0]

    await withTransaction(async (client) => {
      const upserted = await client.query(
        `INSERT INTO payments (booking_id, method, amount, status)
         VALUES ($1, 'cash', $2, 'pending')
         ON CONFLICT (booking_id) DO UPDATE
           SET method = 'cash',
               amount = EXCLUDED.amount,
               status = 'pending',
               provider_ref = NULL,
               expires_at = NULL,
               qr_payload = NULL,
               paid_at = NULL,
               confirmation_source = NULL,
               confirmed_by_user_id = NULL,
               updated_at = now()
           WHERE payments.status <> 'paid'
         RETURNING id`,
        [bookingRow.id, bookingRow.estimated_fare],
      )

      if (upserted.rowCount === 0) {
        throw new HttpError(409, 'Pembayaran pesanan ini sudah lunas.')
      }

      await client.query(
        `UPDATE bookings
         SET payment_method = 'cash',
             payment_status = 'pending',
             paid_at = NULL,
             updated_at = now()
         WHERE id = $1`,
        [bookingRow.id],
      )
    })

    const fresh = await getBookingByCode(booking.id)
    publishBookingUpdated(fresh)
    if (fresh.driver_id) {
      await createNotification({
        userId: fresh.driver_id,
        bookingId: fresh.db_id,
        type: 'payment_created',
        title: 'Pembayaran tunai dicatat',
        message: `Customer memilih pembayaran tunai untuk ${fresh.id}.`,
      })
    }
    res.status(201).json({
      success: true,
      message: 'Pembayaran tunai dicatat dan menunggu konfirmasi driver.',
      data: { booking: fresh, payment: fresh.payment },
    })
  }),
)

router.post(
  '/:code/payment/confirm',
  asyncHandler(async (req, res) => {
    const data = parse(paymentConfirmSchema, req.body ?? {})
    const booking = await loadBooking(req.params.code)

    const isOwner = booking.customer_id === req.user.id
    const isAssignedDriver = booking.driver_id === req.user.id
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isAssignedDriver && !isAdmin) {
      throw new HttpError(403, 'Kamu tidak memiliki akses ke pembayaran ini.')
    }
    if (booking.status !== 'completed') {
      throw new HttpError(409, 'Pembayaran hanya dapat dikonfirmasi setelah perjalanan selesai.')
    }
    if (booking.payment_status === 'paid') {
      const freshPaid = await getBookingByCode(booking.id)
      return res.json({
        success: true,
        message: 'Pembayaran pesanan ini sudah lunas.',
        data: { booking: freshPaid, payment: freshPaid.payment },
      })
    }

    const raw = await query(
      'SELECT id, estimated_fare FROM bookings WHERE code = $1',
      [booking.id],
    )
    const bookingRow = raw.rows[0]

    const existing = await query('SELECT * FROM payments WHERE booking_id = $1', [
      bookingRow.id,
    ])
    const paymentRow = existing.rows[0] ?? null

    if (paymentRow?.status === 'paid') {
      const freshPaid = await getBookingByCode(booking.id)
      return res.json({
        success: true,
        message: 'Pembayaran pesanan ini sudah lunas.',
        data: { booking: freshPaid, payment: freshPaid.payment },
      })
    }

    if (!paymentRow && req.user.role === 'customer') {
      throw new HttpError(409, 'Catat pembayaran tunai terlebih dahulu.')
    }
    if (!paymentRow && !isAssignedDriver && !isAdmin) {
      throw new HttpError(403, 'Konfirmasi tunai dilakukan oleh driver.')
    }
    if (paymentRow && !isAssignedDriver && !isAdmin) {
      throw new HttpError(403, 'Konfirmasi tunai dilakukan oleh driver.')
    }

    const confirmationSource = req.user.role === 'admin' ? 'admin' : 'driver'

    await withTransaction(async (client) => {
      if (!paymentRow) {
        await client.query(
          `INSERT INTO payments
             (booking_id, method, amount, status, paid_at,
              confirmation_source, confirmed_by_user_id)
           VALUES ($1, 'cash', $2, 'paid', now(), $3, $4)`,
          [
            bookingRow.id,
            bookingRow.estimated_fare,
            confirmationSource,
            req.user.id,
          ],
        )
      } else {
        await client.query(
          `UPDATE payments
           SET method = 'cash',
               status = 'paid',
               provider_ref = NULL,
               expires_at = NULL,
               qr_payload = NULL,
               paid_at = now(),
               confirmation_source = $2,
               confirmed_by_user_id = $3,
               updated_at = now()
           WHERE id = $1 AND status <> 'paid'`,
          [paymentRow.id, confirmationSource, req.user.id],
        )
      }

      await client.query(
        `UPDATE bookings
         SET payment_method = 'cash',
             payment_status = 'paid',
             paid_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [bookingRow.id],
      )
    })

    const fresh = await getBookingByCode(booking.id)
    publishBookingUpdated(fresh)
    await notifyBookingParticipants(fresh, {
      type: 'payment_paid',
      title: 'Pembayaran lunas',
      customerMessage: `Pembayaran tunai ${fresh.id} telah dikonfirmasi.`,
      driverMessage: `Pembayaran tunai ${fresh.id} telah dikonfirmasi.`,
    })
    res.json({
      success: true,
      message: 'Pembayaran tunai berhasil dikonfirmasi.',
      data: { booking: fresh, payment: fresh.payment },
    })
  }),
)

export default router
