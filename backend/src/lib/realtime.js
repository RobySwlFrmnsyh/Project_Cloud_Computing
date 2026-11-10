import { Server } from 'socket.io'
import { config } from '../config.js'
import { query } from '../db/pool.js'
import { getBookingByCode } from '../services/bookings.js'
import { findUserById } from '../services/users.js'
import { verifySession } from './session.js'

const activeStatuses = new Set(['accepted', 'arrived', 'in_progress'])
const userRoom = (id) => `realtime:user:${id}`
const vehicleRoom = (type) => `realtime:vehicle:${type}`
const adminRoom = 'realtime:admin'

let io = null

function cookieToken(header = '') {
  const name = `${config.cookieName}=`
  const item = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(name))
  return item ? decodeURIComponent(item.slice(name.length)) : null
}

async function socketUser(socket) {
  const header = socket.request.headers.cookie ?? ''
  const token = cookieToken(header)
  if (!token) return null

  let payload
  try {
    payload = verifySession(token)
  } catch {
    return null
  }

  const user = await findUserById(payload.sub)
  if (!user) return null

  if (user.role === 'driver') {
    const status = user.vehicle?.verification_status
    if (status !== 'approved') return null
  }

  return user
}

function targetRooms(booking) {
  const rooms = [userRoom(booking.customer_id), adminRoom]
  if (booking.driver_id) rooms.push(userRoom(booking.driver_id))
  return rooms
}

function sendTo(rooms, event, payload) {
  if (!io) return
  let target = io
  for (const room of new Set(rooms)) {
    target = target.to(room)
  }
  target.emit(event, payload)
}

export function publishBookingUpdated(booking, { available = false } = {}) {
  if (!io || !booking) return
  sendTo(targetRooms(booking), 'booking:updated', booking)

  if (available && booking.status === 'pending' && !booking.driver_id) {
    sendTo([vehicleRoom(booking.vehicle_type)], 'booking:available', booking)
  }
}

export function publishBookingUnavailable(booking) {
  if (!io || !booking) return
  let target = io.to(vehicleRoom(booking.vehicle_type))
  if (booking.driver_id) target = target.except(userRoom(booking.driver_id))
  target.emit('booking:unavailable', { code: booking.id })
}

export function publishBookingDeleted(booking) {
  if (!io || !booking) return
  sendTo(targetRooms(booking), 'booking:deleted', { code: booking.id })
}

export function publishBookingDeclined(booking, driverId) {
  if (!io || !booking || !driverId) return
  sendTo([userRoom(driverId)], 'booking:unavailable', { code: booking.id })
}

export function publishNotification(userId, notification) {
  if (!io || !notification) return
  sendTo([userRoom(userId)], 'notification:new', notification)
}

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    path: '/api/socket.io',
    serveClient: false,
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
  })

  io.use(async (socket, next) => {
    try {
      const user = await socketUser(socket)
      if (!user) {
        next(new Error('Sesi realtime tidak valid.'))
        return
      }
      socket.data.user = user
      next()
    } catch {
      next(new Error('Gagal memuat sesi realtime.'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    socket.join(userRoom(user.id))
    if (user.role === 'admin') socket.join(adminRoom)
    if (user.role === 'driver' && user.vehicle?.type) {
      socket.join(vehicleRoom(user.vehicle.type))
    }

    socket.emit('realtime:ready', {
      user_id: user.id,
      role: user.role,
      connected_at: new Date().toISOString(),
    })

    socket.on('driver:location', async (payload, ack) => {
      try {
        if (user.role !== 'driver') {
          throw new Error('Hanya driver yang dapat mengirim lokasi.')
        }

        const code = String(payload?.code ?? '').trim().toUpperCase()
        const lat = Number(payload?.lat)
        const lng = Number(payload?.lng)
        if (!code || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          throw new Error('Data lokasi tidak valid.')
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          throw new Error('Koordinat lokasi di luar batas.')
        }

        const booking = await getBookingByCode(code)
        if (!booking || booking.driver_id !== user.id) {
          throw new Error('Pesanan ini bukan tugasmu.')
        }
        if (!activeStatuses.has(booking.status)) {
          throw new Error('Lokasi hanya dapat dibagikan saat perjalanan aktif.')
        }

        const saved = await query(
          `INSERT INTO driver_locations
             (booking_id, driver_id, latitude, longitude, updated_at)
           SELECT b.id, $2, $3, $4, now()
           FROM bookings b
           WHERE b.code = $1
           ON CONFLICT (booking_id) DO UPDATE
             SET driver_id = EXCLUDED.driver_id,
                 latitude = EXCLUDED.latitude,
                 longitude = EXCLUDED.longitude,
                 updated_at = now()
           RETURNING updated_at`,
          [code, user.id, lat, lng],
        )

        const update = {
          booking_id: booking.id,
          driver_id: user.id,
          lat,
          lng,
          updated_at: saved.rows[0]?.updated_at ?? new Date().toISOString(),
        }

        sendTo([userRoom(booking.customer_id), adminRoom], 'driver:location', update)
        if (typeof ack === 'function') ack({ ok: true, update })
      } catch (error) {
        if (typeof ack === 'function') {
          ack({ ok: false, message: error.message })
        }
      }
    })
  })
}

export function closeRealtime() {
  if (!io) return Promise.resolve()
  const server = io
  io = null
  return new Promise((resolve) => server.close(resolve))
}
