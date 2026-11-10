import bcrypt from 'bcryptjs'
import { pool, withTransaction } from './pool.js'
import { estimateDurationMinutes, estimateFare, haversineKm } from '../lib/fare.js'

const LOCATIONS = [
  { id: 'itb', name: 'Kampus ITB, Ganesha', area: 'Bandung', lat: -6.8915, lng: 107.6107 },
  { id: 'stasiun', name: 'Stasiun Bandung', area: 'Bandung', lat: -6.9147, lng: 107.6022 },
  { id: 'dago', name: 'Dago Pakar', area: 'Bandung', lat: -6.8432, lng: 107.6188 },
  { id: 'pvj', name: 'Paris Van Java', area: 'Bandung', lat: -6.8916, lng: 107.5937 },
  { id: 'unpad', name: 'Kampus Unpad, Dipatiukur', area: 'Bandung', lat: -6.8913, lng: 107.6178 },
  { id: 'sate', name: 'Gedung Sate', area: 'Bandung', lat: -6.9025, lng: 107.6188 },
  { id: 'borma', name: 'Borma Setiabudi', area: 'Bandung', lat: -6.8685, lng: 107.5974 },
  { id: 'cicaheum', name: 'Terminal Cicaheum', area: 'Bandung', lat: -6.8958, lng: 107.6512 },
]

function buildSeed(now = new Date()) {
  const hoursFromNow = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000)
  const daysAgo = (days, hour = 9, minute = 0) => {
    const date = new Date(now)
    date.setDate(date.getDate() - days)
    date.setHours(hour, minute, 0, 0)
    return date
  }
  const minutesAgo = (minutes) => new Date(now.getTime() - minutes * 60 * 1000)

  const users = [
    {
      id: 1,
      name: 'Roby Syawal',
      email: 'customer@demo.app',
      phone: '081234567890',
      role: 'customer',
      created_at: daysAgo(64, 10, 15),
    },
    {
      id: 2,
      name: 'Budi Santoso',
      email: 'driver@demo.app',
      phone: '081345678901',
      role: 'driver',
      created_at: daysAgo(120, 8, 0),
    },
    {
      id: 3,
      name: 'Sari Wulandari',
      email: 'admin@demo.app',
      phone: '081298765432',
      role: 'admin',
      created_at: daysAgo(200, 9, 30),
    },
    {
      id: 4,
      name: 'Dinda Prameswari',
      email: 'dinda@demo.app',
      phone: '081377788899',
      role: 'customer',
      created_at: daysAgo(22, 14, 5),
    },
    {
      id: 5,
      name: 'Agus Salim',
      email: 'agus@demo.app',
      phone: '081355566677',
      role: 'driver',
      created_at: daysAgo(2, 11, 20),
    },
    {
      id: 6,
      name: 'Rina Kartika',
      email: 'rina@demo.app',
      phone: '081366677788',
      role: 'driver',
      created_at: daysAgo(90, 13, 45),
    },
    {
      id: 7,
      name: 'Fajar Nugraha',
      email: 'fajar@demo.app',
      phone: '081399900011',
      role: 'customer',
      created_at: daysAgo(15, 16, 30),
    },
  ]

  const driverProfiles = [
    {
      id: 1,
      user_id: 2,
      vehicle_type: 'motor',
      vehicle_plate: 'B 4821 KZT',
      verification_status: 'approved',
      availability_status: 'online',
      rating: 4.9,
      total_trips: 328,
      verified_at: daysAgo(118, 9, 0),
      created_at: daysAgo(120, 8, 5),
    },
    {
      id: 2,
      user_id: 5,
      vehicle_type: 'motor',
      vehicle_plate: 'B 3901 TQS',
      verification_status: 'pending',
      availability_status: 'offline',
      rating: 0,
      total_trips: 0,
      verified_at: null,
      created_at: daysAgo(2, 11, 25),
    },
    {
      id: 3,
      user_id: 6,
      vehicle_type: 'mobil',
      vehicle_plate: 'B 1788 RIN',
      verification_status: 'approved',
      availability_status: 'offline',
      rating: 4.8,
      total_trips: 214,
      verified_at: daysAgo(88, 14, 0),
      created_at: daysAgo(90, 13, 50),
    },
  ]

  const rawBookings = [
    {
      id: 1,
      code: 'AJT-1042',
      customer_id: 1,
      driver_id: 2,
      vehicle_type: 'motor',
      pickup: 'itb',
      destination: 'stasiun',
      scheduled_at: hoursFromNow(1.5),
      status: 'accepted',
      notes: 'Tolong tunggu di gerbang utama.',
      created_at: minutesAgo(18),
      payment_method: null,
      payment_status: 'unpaid',
      paid_at: null,
    },
    {
      id: 2,
      code: 'AJT-1044',
      customer_id: 7,
      driver_id: null,
      vehicle_type: 'mobil',
      pickup: 'pvj',
      destination: 'stasiun',
      scheduled_at: hoursFromNow(0.5),
      status: 'pending',
      notes: '',
      created_at: minutesAgo(6),
      payment_method: null,
      payment_status: 'unpaid',
      paid_at: null,
    },
    {
      id: 3,
      code: 'AJT-1043',
      customer_id: 4,
      driver_id: null,
      vehicle_type: 'motor',
      pickup: 'itb',
      destination: 'dago',
      scheduled_at: hoursFromNow(0.75),
      status: 'pending',
      notes: '',
      created_at: minutesAgo(11),
      payment_method: null,
      payment_status: 'unpaid',
      paid_at: null,
    },
    {
      id: 4,
      code: 'AJT-1038',
      customer_id: 1,
      driver_id: 2,
      vehicle_type: 'motor',
      pickup: 'dago',
      destination: 'pvj',
      scheduled_at: daysAgo(1, 8, 30),
      status: 'completed',
      notes: '',
      created_at: daysAgo(1, 8, 12),
      payment_method: 'cash',
      payment_status: 'paid',
      paid_at: daysAgo(1, 9, 2),
    },
    {
      id: 5,
      code: 'AJT-1039',
      customer_id: 4,
      driver_id: 2,
      vehicle_type: 'motor',
      pickup: 'stasiun',
      destination: 'sate',
      scheduled_at: daysAgo(2, 17, 0),
      status: 'completed',
      notes: '',
      created_at: daysAgo(2, 16, 44),
      payment_method: 'cash',
      payment_status: 'paid',
      paid_at: daysAgo(2, 17, 26),
    },
    {
      id: 6,
      code: 'AJT-1035',
      customer_id: 7,
      driver_id: 2,
      vehicle_type: 'motor',
      pickup: 'borma',
      destination: 'unpad',
      scheduled_at: daysAgo(3, 7, 15),
      status: 'completed',
      notes: '',
      created_at: daysAgo(3, 7, 2),
      payment_method: 'cash',
      payment_status: 'paid',
      paid_at: daysAgo(3, 7, 58),
    },
    {
      id: 7,
      code: 'AJT-1031',
      customer_id: 1,
      driver_id: 6,
      vehicle_type: 'mobil',
      pickup: 'itb',
      destination: 'sate',
      scheduled_at: daysAgo(5, 13, 0),
      status: 'completed',
      notes: '',
      created_at: daysAgo(5, 12, 40),
      payment_method: 'cash',
      payment_status: 'paid',
      paid_at: daysAgo(5, 13, 41),
    },
    {
      id: 8,
      code: 'AJT-1027',
      customer_id: 1,
      driver_id: null,
      vehicle_type: 'motor',
      pickup: 'cicaheum',
      destination: 'itb',
      scheduled_at: daysAgo(8, 19, 0),
      status: 'cancelled',
      notes: 'Driver tidak tersedia, pesanan dibatalkan.',
      created_at: daysAgo(8, 18, 25),
      payment_method: null,
      payment_status: 'unpaid',
      paid_at: null,
    },
    {
      id: 9,
      code: 'AJT-1020',
      customer_id: 1,
      driver_id: 2,
      vehicle_type: 'motor',
      pickup: 'sate',
      destination: 'dago',
      scheduled_at: daysAgo(12, 10, 0),
      status: 'completed',
      notes: '',
      created_at: daysAgo(12, 9, 41),
      payment_method: 'cash',
      payment_status: 'paid',
      paid_at: daysAgo(12, 10, 33),
    },
  ]

  const locationById = Object.fromEntries(LOCATIONS.map((location) => [location.id, location]))

  const bookings = rawBookings.map((booking) => {
    const pickup = locationById[booking.pickup]
    const destination = locationById[booking.destination]
    const distanceKm = Number(haversineKm(pickup, destination).toFixed(1))

    return {
      ...booking,
      pickup_location_id: booking.pickup,
      destination_location_id: booking.destination,
      pickup_address: `${pickup.name}, ${pickup.area}`,
      pickup_latitude: pickup.lat,
      pickup_longitude: pickup.lng,
      destination_address: `${destination.name}, ${destination.area}`,
      destination_latitude: destination.lat,
      destination_longitude: destination.lng,
      distance_km: distanceKm,
      route_duration_minutes: estimateDurationMinutes(distanceKm),
      route_geometry: [
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng],
      ],
      route_provider: 'haversine',
      estimated_fare: estimateFare(distanceKm, booking.vehicle_type).total,
    }
  })

  const payments = bookings
    .filter((booking) => booking.payment_status === 'paid')
    .map((booking, index) => ({
      id: index + 1,
      booking_id: booking.id,
      method: booking.payment_method,
      amount: booking.estimated_fare,
      status: 'paid',
      provider_ref: null,
      created_at: booking.paid_at,
      updated_at: booking.paid_at,
      paid_at: booking.paid_at,
    }))

  return { users, driverProfiles, locations: LOCATIONS, bookings, payments }
}

async function insertSeed(client, data) {
  const passwordHash = await bcrypt.hash('demo1234', 10)

  for (const user of data.users) {
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, phone, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user.id,
        user.name,
        user.email,
        passwordHash,
        user.phone,
        user.role,
        user.created_at,
      ],
    )
  }

  for (const profile of data.driverProfiles) {
    await client.query(
      `INSERT INTO driver_profiles
        (id, user_id, vehicle_type, vehicle_plate, verification_status,
         availability_status, rating, total_trips, verified_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      [
        profile.id,
        profile.user_id,
        profile.vehicle_type,
        profile.vehicle_plate,
        profile.verification_status,
        profile.availability_status,
        profile.rating,
        profile.total_trips,
        profile.verified_at,
        profile.created_at,
      ],
    )
  }

  for (const location of data.locations) {
    await client.query(
      `INSERT INTO locations (id, name, area, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5)`,
      [location.id, location.name, location.area, location.lat, location.lng],
    )
  }

  for (const booking of data.bookings) {
    await client.query(
      `INSERT INTO bookings
        (id, code, customer_id, driver_id, vehicle_type, pickup_location_id,
         destination_location_id, pickup_address, pickup_latitude, pickup_longitude,
         destination_address, destination_latitude, destination_longitude,
         distance_km, route_duration_minutes, route_geometry, route_provider,
         scheduled_at, estimated_fare, status, notes, payment_method,
         payment_status, paid_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
               $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $25)`,
      [
        booking.id,
        booking.code,
        booking.customer_id,
        booking.driver_id,
        booking.vehicle_type,
        booking.pickup_location_id,
        booking.destination_location_id,
        booking.pickup_address,
        booking.pickup_latitude,
        booking.pickup_longitude,
        booking.destination_address,
        booking.destination_latitude,
        booking.destination_longitude,
        booking.distance_km,
        booking.route_duration_minutes,
        JSON.stringify(booking.route_geometry),
        booking.route_provider,
        booking.scheduled_at,
        booking.estimated_fare,
        booking.status,
        booking.notes,
        booking.payment_method,
        booking.payment_status,
        booking.paid_at,
        booking.created_at,
      ],
    )
  }

  for (const payment of data.payments) {
    await client.query(
      `INSERT INTO payments
        (id, booking_id, method, amount, status, provider_ref, created_at, updated_at, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        payment.id,
        payment.booking_id,
        payment.method,
        payment.amount,
        payment.status,
        payment.provider_ref,
        payment.created_at,
        payment.updated_at,
        payment.paid_at,
      ],
    )
  }

  await client.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`)
  await client.query(
    `SELECT setval('driver_profiles_id_seq', (SELECT MAX(id) FROM driver_profiles))`,
  )
  await client.query(`SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings))`)
  await client.query(`SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments))`)
  await client.query(`SELECT setval('booking_code_seq', 1044, true)`)
}

export async function seedDemoData({ force = false } = {}) {
  return withTransaction(async (client) => {
    const count = await client.query('SELECT COUNT(*)::int AS total FROM users')

    if (!force && count.rows[0].total > 0) {
      return { seeded: false, users: count.rows[0].total }
    }

    if (force) {
      await client.query(
        'TRUNCATE users, driver_profiles, locations, bookings, payments RESTART IDENTITY CASCADE',
      )
    }

    const data = buildSeed()
    await insertSeed(client, data)

    return {
      seeded: true,
      users: data.users.length,
      bookings: data.bookings.length,
      payments: data.payments.length,
    }
  })
}

export async function databaseIsEmpty() {
  const result = await pool.query('SELECT COUNT(*)::int AS total FROM users')
  return result.rows[0].total === 0
}
