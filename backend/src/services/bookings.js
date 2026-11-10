import { query } from '../db/pool.js'
import { serializeBooking } from '../lib/serializers.js'

export const BOOKING_SELECT = `
  SELECT b.*,
         b.pickup_address AS pickup_location_name,
         b.pickup_latitude AS pickup_lat,
         b.pickup_longitude AS pickup_lng,
         b.destination_address AS destination_name,
         b.destination_latitude AS destination_lat,
         b.destination_longitude AS destination_lng,
         cu.name AS customer_name,
         cu.email AS customer_email,
         cu.phone AS customer_phone,
         du.name AS driver_name,
         du.email AS driver_email,
         du.phone AS driver_phone,
         dp.vehicle_type AS driver_vehicle_type,
         dp.vehicle_plate AS driver_vehicle_plate,
         dp.verification_status AS driver_verification_status,
         dp.availability_status AS driver_availability_status,
         dp.rating AS driver_rating,
         dp.total_trips AS driver_total_trips,
         p.id AS payment_id,
         p.method AS payment_row_method,
         p.amount AS payment_amount,
         p.status AS payment_row_status,
         p.created_at AS payment_created_at,
         p.paid_at AS payment_paid_at,
         p.confirmation_source AS payment_confirmation_source,
         pcu.id AS payment_confirmed_by_id,
         pcu.name AS payment_confirmed_by_name,
         pcu.role AS payment_confirmed_by_role,
         dl.latitude AS driver_location_latitude,
         dl.longitude AS driver_location_longitude,
         dl.updated_at AS driver_location_updated_at
  FROM bookings b
  JOIN users cu ON cu.id = b.customer_id
  LEFT JOIN users du ON du.id = b.driver_id
  LEFT JOIN driver_profiles dp ON dp.user_id = b.driver_id
  LEFT JOIN payments p ON p.booking_id = b.id
  LEFT JOIN users pcu ON pcu.id = p.confirmed_by_user_id
  LEFT JOIN driver_locations dl ON dl.booking_id = b.id
`

export async function getBookingByCode(code) {
  const normalized = String(code).trim().toUpperCase()
  const result = await query(`${BOOKING_SELECT} WHERE b.code = $1`, [normalized])
  return result.rows[0] ? serializeBooking(result.rows[0]) : null
}

function bookingFilter(user) {
  if (user.role === 'admin') {
    return { where: '', params: [] }
  }

  if (user.role === 'driver') {
    const vehicleType = user.vehicle?.type
    if (vehicleType) {
      return {
        where: `WHERE (b.driver_id = $1
                 OR (b.status = 'pending' AND b.driver_id IS NULL AND b.vehicle_type = $2))
                AND NOT EXISTS (
                  SELECT 1 FROM booking_declines d
                  WHERE d.booking_id = b.id AND d.driver_id = $1
                )`,
        params: [user.id, vehicleType],
      }
    }

    return {
      where: `WHERE b.driver_id = $1
              AND NOT EXISTS (
                SELECT 1 FROM booking_declines d
                WHERE d.booking_id = b.id AND d.driver_id = $1
              )`,
      params: [user.id],
    }
  }

  return {
    where: 'WHERE b.customer_id = $1',
    params: [user.id],
  }
}

export async function listBookingsFor(user, { page, limit } = {}) {
  const { where, params } = bookingFilter(user)
  const paginated = Boolean(page || limit)
  const currentPage = page ?? 1
  const pageSize = limit ?? 20

  let sql = `${BOOKING_SELECT} ${where} ORDER BY b.created_at DESC`
  const values = [...params]

  if (paginated) {
    values.push(pageSize, (currentPage - 1) * pageSize)
    sql += ` LIMIT $${values.length - 1} OFFSET $${values.length}`
  }

  const result = await query(sql, values)
  let pagination = null

  if (paginated) {
    const count = await query(
      `SELECT COUNT(*)::int AS total FROM bookings b ${where}`,
      params,
    )
    const total = count.rows[0].total
    pagination = {
      page: currentPage,
      limit: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    }
  }

  return {
    bookings: result.rows.map(serializeBooking),
    pagination,
  }
}

export function canViewBooking(user, booking) {
  if (!booking) return false
  if (user.role === 'admin') return true
  if (user.role === 'customer') return booking.customer_id === user.id
  if (user.role === 'driver') {
    if (booking.driver_id === user.id) return true
    return (
      booking.status === 'pending' &&
      booking.driver_id === null &&
      booking.vehicle_type === user.vehicle?.type
    )
  }
  return false
}
