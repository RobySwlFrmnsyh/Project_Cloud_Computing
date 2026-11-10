import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, describe, it } from 'node:test'
import { io } from 'socket.io-client'
import request from 'supertest'

process.env.NODE_ENV = 'test'
process.env.USE_EMBEDDED_DB = 'true'
process.env.DATABASE_URL = 'postgres://ajt:ajt@127.0.0.1:5434/ajt_test'
process.env.PG_DATA_DIR = '.pgdata-test'
process.env.JWT_SECRET = 'test-secret-yang-cukup-panjang-untuk-pengujian'
process.env.SEED_DEMO = 'true'
process.env.ALLOW_DEMO_RESET = 'true'
process.env.CORS_ORIGIN = 'http://localhost:5173'
process.env.ROAD_ROUTING_ENABLED = 'false'
process.env.GOOGLE_MAPS_API_KEY = ''
process.env.MAPBOX_ACCESS_TOKEN = ''

let app
let setupDatabase
let seedDemoData
let closePool
let stopEmbeddedDatabase
let initRealtime
let closeRealtime

const tokens = {}

const PLACES = {
  itb: {
    address: 'Kampus ITB, Ganesha, Bandung',
    lat: -6.8915,
    lng: 107.6107,
  },
  stasiun: {
    address: 'Stasiun Bandung, Bandung',
    lat: -6.9147,
    lng: 107.6022,
  },
  dago: {
    address: 'Dago Pakar, Bandung',
    lat: -6.8432,
    lng: 107.6188,
  },
  pvj: {
    address: 'Paris Van Java, Bandung',
    lat: -6.8916,
    lng: 107.5937,
  },
}

before(async () => {
  ;({ setupDatabase } = await import('../src/db/setup.js'))
  ;({ seedDemoData } = await import('../src/db/seed.js'))
  ;({ closePool } = await import('../src/db/pool.js'))
  ;({ stopEmbeddedDatabase } = await import('../src/db/embedded.js'))
  ;({ initRealtime, closeRealtime } = await import('../src/lib/realtime.js'))
  ;({ default: app } = await import('../src/app.js'))

  await setupDatabase()
  await seedDemoData({ force: true })
})

after(async () => {
  await closePool().catch(() => {})
  await stopEmbeddedDatabase()
})

function cookieFrom(response) {
  const setCookie = response.headers['set-cookie'] ?? []
  return setCookie.map((value) => value.split(';')[0]).join('; ')
}

async function login(email, password = 'demo1234') {
  const response = await request(app).post('/api/auth/login').send({ email, password })
  assert.equal(response.status, 200, response.text)
  return cookieFrom(response)
}

function auth(req, cookie) {
  return req.set('Cookie', cookie)
}

async function adminCookie() {
  if (!tokens.admin) tokens.admin = await login('admin@demo.app')
  return tokens.admin
}

async function customerCookie() {
  if (!tokens.customer) tokens.customer = await login('customer@demo.app')
  return tokens.customer
}

async function driverCookie() {
  if (!tokens.driver) tokens.driver = await login('driver@demo.app')
  return tokens.driver
}

function connectSocket(cookie, port) {
  const socket = io(`http://127.0.0.1:${port}`, {
    path: '/api/socket.io',
    transports: ['websocket'],
    extraHeaders: { Cookie: cookie },
    reconnection: false,
    forceNew: true,
  })

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.disconnect()
      reject(new Error('Koneksi Socket.IO melewati batas waktu.'))
    }, 5000)

    socket.once('connect', () => {
      clearTimeout(timer)
      resolve(socket)
    })
    socket.once('connect_error', (error) => {
      clearTimeout(timer)
      socket.disconnect()
      reject(error)
    })
  })
}

function nextEvent(socket, event, predicate = () => true, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler)
      reject(new Error(`Event ${event} tidak diterima.`))
    }, timeout)

    function handler(payload) {
      if (!predicate(payload)) return
      clearTimeout(timer)
      socket.off(event, handler)
      resolve(payload)
    }

    socket.on(event, handler)
  })
}

describe('Anter Jemput Teman API', () => {
  it('mengembalikan health check', async () => {
    const response = await request(app).get('/api/health')
    assert.equal(response.status, 200)
    assert.equal(response.body.success, true)
    assert.equal(response.body.data.status, 'ok')
  })

  it('menolak akses tanpa sesi', async () => {
    const response = await request(app).get('/api/bookings')
    assert.equal(response.status, 401)
    assert.equal(response.body.success, false)
  })

  it('login demo berhasil dan mengembalikan user tanpa password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@demo.app', password: 'demo1234' })

    assert.equal(response.status, 200)
    assert.equal(response.body.data.user.email, 'customer@demo.app')
    assert.equal(response.body.data.user.password, undefined)
    assert.equal(response.body.data.user.password_hash, undefined)
    assert.match(response.headers['set-cookie'][0], /ajt_session=/)
    assert.match(response.headers['set-cookie'][0], /HttpOnly/i)
  })

  it('menolak kata sandi salah', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@demo.app', password: 'salah-sekali' })

    assert.equal(response.status, 401)
  })

  it('memvalidasi registrasi di backend', async () => {
    const response = await request(app).post('/api/auth/register').send({})
    assert.equal(response.status, 422)
    assert.equal(response.body.success, false)
    assert.ok(response.body.errors.name)
    assert.ok(response.body.errors.email)
    assert.ok(response.body.errors.phone)
    assert.ok(response.body.errors.password)
    assert.ok(response.body.errors.role)
  })

  it('mendaftarkan customer baru tanpa sesi otomatis', async () => {
    const email = `customer-${Date.now()}@demo.app`
    const password = 'rahasia123'
    const response = await request(app).post('/api/auth/register').send({
      name: 'Pelanggan Baru',
      email,
      phone: '081200001111',
      password,
      role: 'customer',
    })

    assert.equal(response.status, 201, response.text)
    assert.equal(response.body.data.user.role, 'customer')
    assert.equal(response.body.data.user.email, email)
    assert.equal(response.headers['set-cookie'], undefined)

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
    assert.equal(loginResponse.status, 200, loginResponse.text)

    const cookie = cookieFrom(loginResponse)
    const me = await auth(request(app).get('/api/users/me'), cookie)
    assert.equal(me.status, 200)
    assert.equal(me.body.data.user.email, email)
  })

  it('menolak email duplikat', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Duplikat',
      email: 'customer@demo.app',
      phone: '081200002222',
      password: 'rahasia123',
      role: 'customer',
    })

    assert.equal(response.status, 409)
  })

  it('driver baru menunggu verifikasi dan tidak dapat masuk', async () => {
    const email = `driver-${Date.now()}@demo.app`
    const register = await request(app).post('/api/auth/register').send({
      name: 'Driver Baru',
      email,
      phone: '081200003333',
      password: 'rahasia123',
      role: 'driver',
      vehicleType: 'motor',
      plate: 'B 9999 NEW',
    })

    assert.equal(register.status, 201)
    assert.equal(register.body.data.user.vehicle.verification_status, 'pending')
    assert.equal(register.headers['set-cookie'], undefined)

    const driverId = register.body.data.user.id
    const rejected = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'rahasia123' })
    assert.equal(rejected.status, 403)

    const admin = await adminCookie()
    const approve = await auth(
      request(app).patch(`/api/drivers/${driverId}/verification`),
      admin,
    ).send({ status: 'approved' })
    assert.equal(approve.status, 200, approve.text)
    assert.equal(approve.body.data.user.vehicle.verification_status, 'approved')

    const accepted = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'rahasia123' })
    assert.equal(accepted.status, 200)
  })

  it('membatasi daftar pengguna untuk admin', async () => {
    const customer = await customerCookie()
    const forbidden = await auth(request(app).get('/api/users'), customer)
    assert.equal(forbidden.status, 403)

    const admin = await adminCookie()
    const allowed = await auth(request(app).get('/api/users'), admin)
    assert.equal(allowed.status, 200)
    assert.ok(allowed.body.data.users.length >= 7)
    assert.equal(allowed.body.data.users[0].password_hash, undefined)
  })

  it('mengambil lokasi dari database', async () => {
    const response = await request(app).get('/api/locations')
    assert.equal(response.status, 200)
    assert.equal(response.body.data.locations.length, 8)
    const itb = response.body.data.locations.find((item) => item.id === 'itb')
    assert.deepEqual(itb.coords, { lat: -6.8915, lng: 107.6107 })
  })

  it('mengubah respons OSRM menjadi jarak, durasi, dan geometri rute', async () => {
    const { parseOsrmRoute } = await import('../src/lib/routing.js')
    const route = parseOsrmRoute({
      code: 'Ok',
      routes: [
        {
          distance: 4488.7,
          duration: 455.9,
          geometry: {
            coordinates: [
              [107.611059, -6.891382],
              [107.608093, -6.91616],
            ],
          },
        },
      ],
    })

    assert.equal(route.distanceKm, 4.5)
    assert.equal(route.durationMinutes, 8)
    assert.equal(route.provider, 'osrm')
    assert.deepEqual(route.geometry[0], [-6.891382, 107.611059])
    assert.equal(parseOsrmRoute({ code: 'NoRoute', routes: [] }), null)
  })

  it('mengubah saran autocomplete Google menjadi hasil pencarian', async () => {
    const { parseGoogleAutocomplete, parseGoogleDetails, kindOfGoogleTypes } =
      await import('../src/lib/geocode.js')

    const results = parseGoogleAutocomplete({
      suggestions: [
        {
          placePrediction: {
            placeId: 'ChIJ1234567890',
            text: { text: 'Dusun Sembalun, Sembalun, Lombok Timur' },
            structuredFormat: {
              mainText: { text: 'Dusun Sembalun' },
              secondaryText: { text: 'Sembalun, Lombok Timur, Nusa Tenggara Barat' },
            },
            types: ['geocode', 'political'],
            distanceMeters: 3200,
          },
        },
        { queryPrediction: { text: { text: 'Sembalun' } } },
      ],
    })

    assert.equal(results.length, 1)
    assert.equal(results[0].placeId, 'ChIJ1234567890')
    assert.equal(results[0].label, 'Dusun Sembalun')
    assert.equal(results[0].provider, 'google')
    assert.equal(results[0].lat, null)
    assert.equal(results[0].kind, 'Wilayah')
    assert.equal(kindOfGoogleTypes(['route']), 'Jalan')
    assert.equal(kindOfGoogleTypes(['street_address']), 'Alamat')
    assert.equal(kindOfGoogleTypes(['point_of_interest']), 'Tempat')

    const details = parseGoogleDetails({
      displayName: { text: 'Dusun Sembalun' },
      formattedAddress: 'Dusun Sembalun, Sembalun, Lombok Timur, NTB, Indonesia',
      location: { latitude: -8.3635, longitude: 116.5321 },
      types: ['geocode', 'political'],
    })
    assert.equal(details.lat, -8.3635)
    assert.equal(details.lng, 116.5321)
    assert.equal(details.kind, 'Wilayah')
  })

  it('mengubah feature Mapbox menjadi hasil pencarian', async () => {
    const { parseMapboxFeature, kindOfMapboxType } = await import('../src/lib/geocode.js')

    const place = parseMapboxFeature({
      geometry: { coordinates: [116.5321, -8.3635] },
      properties: {
        name_preferred: 'Sembalun Lawang',
        name: 'Sembalun Lawang',
        feature_type: 'place',
        place_formatted: 'Sembalun, Lombok Timur, Nusa Tenggara Barat, Indonesia',
        full_address: 'Sembalun Lawang, Sembalun, Lombok Timur, Nusa Tenggara Barat, Indonesia',
        mapbox_id: 'mapbox-place-1',
      },
    })

    assert.equal(place.lat, -8.3635)
    assert.equal(place.lng, 116.5321)
    assert.equal(place.label, 'Sembalun Lawang')
    assert.equal(place.kind, 'Wilayah')
    assert.equal(place.provider, 'mapbox')
    assert.equal(place.mapboxId, 'mapbox-place-1')
    assert.equal(kindOfMapboxType('street'), 'Jalan')
    assert.equal(kindOfMapboxType('address'), 'Alamat')
    assert.equal(kindOfMapboxType('poi'), 'Tempat')
    assert.equal(parseMapboxFeature({ geometry: {} }), null)
  })

  it('mengembalikan status geocode dan validasi input tanpa memanggil layanan luar', async () => {
    const customer = await customerCookie()
    const status = await auth(request(app).get('/api/geocode/status'), customer)
    assert.equal(status.status, 200)
    assert.equal(status.body.data.google, false)
    assert.equal(status.body.data.mapbox, false)
    assert.equal(status.body.data.active, 'osm')
    assert.equal(status.body.data.fallback, 'photon+nominatim')

    const short = await auth(
      request(app).get('/api/geocode/search?q=a'),
      customer,
    )
    assert.equal(short.status, 422)

    const invalidReverse = await auth(
      request(app).get('/api/geocode/reverse?lat=999&lng=0'),
      customer,
    )
    assert.equal(invalidReverse.status, 422)
  })

  it('mengestimasi rute dan menolak titik yang sama', async () => {
    const customer = await customerCookie()

    const estimate = await auth(
      request(app).post('/api/routes/estimate'),
      customer,
    ).send({
      pickup: PLACES.itb,
      destination: PLACES.stasiun,
    })

    assert.equal(estimate.status, 200, estimate.text)
    assert.equal(estimate.body.data.route.distance_km, 2.7)
    assert.equal(estimate.body.data.route.duration_minutes, 10)
    assert.equal(estimate.body.data.route.provider, 'haversine')
    assert.equal(estimate.body.data.route.geometry.length, 2)

    const samePoint = await auth(
      request(app).post('/api/routes/estimate'),
      customer,
    ).send({
      pickup: PLACES.itb,
      destination: PLACES.itb,
    })
    assert.equal(samePoint.status, 422)
    assert.ok(samePoint.body.errors.destination)
  })

  it('memvalidasi dan menghitung tarif pesanan di server', async () => {
    const customer = await customerCookie()

    const sameLocation = await auth(
      request(app).post('/api/bookings'),
      customer,
    ).send({
      pickup: PLACES.itb,
      destination: PLACES.itb,
      vehicle_type: 'motor',
      scheduled_at: new Date().toISOString(),
    })
    assert.equal(sameLocation.status, 422)
    assert.ok(sameLocation.body.errors.destination)

    const invalidVehicle = await auth(
      request(app).post('/api/bookings'),
      customer,
    ).send({
      pickup: PLACES.itb,
      destination: PLACES.stasiun,
      vehicle_type: 'pesawat',
      scheduled_at: new Date().toISOString(),
    })
    assert.equal(invalidVehicle.status, 422)
    assert.ok(invalidVehicle.body.errors.vehicle_type)

    const invalidPoint = await auth(
      request(app).post('/api/bookings'),
      customer,
    ).send({
      pickup: { address: 'Titik tidak valid', lat: -91, lng: 200 },
      destination: PLACES.stasiun,
      vehicle_type: 'motor',
      scheduled_at: new Date().toISOString(),
    })
    assert.equal(invalidPoint.status, 422)
    assert.ok(invalidPoint.body.errors['pickup.lat'])
    assert.ok(invalidPoint.body.errors['pickup.lng'])

    const created = await auth(request(app).post('/api/bookings'), customer).send({
      pickup: PLACES.itb,
      destination: PLACES.stasiun,
      vehicle_type: 'motor',
      scheduled_at: new Date().toISOString(),
      notes: 'Tolong jemput di gerbang.',
      estimated_fare: 1,
    })

    assert.equal(created.status, 201, created.text)
    const booking = created.body.data.booking
    assert.equal(booking.estimated_fare, 15500)
    assert.equal(booking.distance_km, 2.7)
    assert.equal(booking.route_duration_minutes, 10)
    assert.equal(booking.route_provider, 'haversine')
    assert.deepEqual(booking.route_geometry, [
      [PLACES.itb.lat, PLACES.itb.lng],
      [PLACES.stasiun.lat, PLACES.stasiun.lng],
    ])
    assert.equal(booking.pickup_location, PLACES.itb.address)
    assert.equal(booking.destination, PLACES.stasiun.address)
    assert.equal(booking.pickup_location_id, null)
    assert.equal(booking.destination_location_id, null)
    assert.deepEqual(booking.pickup_coords, { lat: -6.8915, lng: 107.6107 })
    assert.deepEqual(booking.destination_coords, { lat: -6.9147, lng: 107.6022 })
    assert.equal(booking.payment_status, 'unpaid')
    assert.equal(booking.customer.name, 'Roby Syawal')
    tokens.bookingCode = booking.id
  })

  it('customer dapat memperbarui pesanan pending dan driver dapat menolaknya', async () => {
    const customer = await customerCookie()
    const driver = await driverCookie()
    const other = await login('dinda@demo.app')

    const updated = await auth(
      request(app).put(`/api/bookings/${tokens.bookingCode}`),
      customer,
    ).send({
      pickup: PLACES.itb,
      destination: PLACES.stasiun,
      vehicle_type: 'motor',
      scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      notes: 'Catatan sudah diperbarui.',
    })
    assert.equal(updated.status, 200, updated.text)
    assert.equal(updated.body.data.booking.notes, 'Catatan sudah diperbarui.')

    const forbidden = await auth(
      request(app).put(`/api/bookings/${tokens.bookingCode}`),
      other,
    ).send({
      pickup: PLACES.itb,
      destination: PLACES.stasiun,
      vehicle_type: 'motor',
      scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    assert.equal(forbidden.status, 403)

    const created = await auth(request(app).post('/api/bookings'), customer).send({
      pickup: PLACES.dago,
      destination: PLACES.pvj,
      vehicle_type: 'motor',
      scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    assert.equal(created.status, 201, created.text)
    const declinedCode = created.body.data.booking.id

    const decline = await auth(
      request(app).post(`/api/bookings/${declinedCode}/decline`),
      driver,
    )
    assert.equal(decline.status, 200, decline.text)

    const list = await auth(request(app).get('/api/bookings'), driver)
    assert.equal(list.status, 200)
    assert.ok(!list.body.data.bookings.some((booking) => booking.id === declinedCode))

    const repeated = await auth(
      request(app).post(`/api/bookings/${declinedCode}/decline`),
      driver,
    )
    assert.equal(repeated.status, 200, repeated.text)
  })

  it('melarang customer menerima pesanan sendiri', async () => {
    const customer = await customerCookie()
    const response = await auth(
      request(app).post(`/api/bookings/${tokens.bookingCode}/accept`),
      customer,
    )
    assert.equal(response.status, 403)
  })

  it('driver menerima pesanan lalu menjalankan transisi status', async () => {
    const driver = await driverCookie()

    const list = await auth(request(app).get('/api/bookings'), driver)
    assert.equal(list.status, 200)
    assert.ok(list.body.data.bookings.some((booking) => booking.id === tokens.bookingCode))

    const accept = await auth(
      request(app).post(`/api/bookings/${tokens.bookingCode}/accept`),
      driver,
    )
    assert.equal(accept.status, 200, accept.text)
    assert.equal(accept.body.data.booking.status, 'accepted')
    assert.equal(accept.body.data.booking.driver.name, 'Budi Santoso')

    const skipped = await auth(
      request(app).patch(`/api/bookings/${tokens.bookingCode}/status`),
      driver,
    ).send({ status: 'completed' })
    assert.equal(skipped.status, 409)

    for (const status of ['arrived', 'in_progress', 'completed']) {
      const response = await auth(
        request(app).patch(`/api/bookings/${tokens.bookingCode}/status`),
        driver,
      ).send({ status })
      assert.equal(response.status, 200, response.text)
      assert.equal(response.body.data.booking.status, status)
    }
  })

  it('customer memberi rating setelah perjalanan selesai', async () => {
    const customer = await customerCookie()
    const driver = await driverCookie()

    const rated = await auth(
      request(app).post(`/api/bookings/${tokens.bookingCode}/rating`),
      customer,
    ).send({ rating: 5, comment: 'Perjalanan nyaman.' })
    assert.equal(rated.status, 200, rated.text)
    assert.equal(rated.body.data.booking.rating, 5)
    assert.equal(rated.body.data.booking.rating_comment, 'Perjalanan nyaman.')
    assert.ok(rated.body.data.booking.rated_at)
    assert.equal(rated.body.data.booking.driver.vehicle.rating, 5)

    const notifications = await auth(request(app).get('/api/notifications?limit=20'), driver)
    assert.equal(notifications.status, 200, notifications.text)
    assert.ok(
      notifications.body.data.notifications.some(
        (notification) => notification.type === 'booking_rated',
      ),
    )
  })

  it('customer tidak dapat mengubah status perjalanan secara langsung', async () => {
    const customer = await customerCookie()
    const response = await auth(
      request(app).patch(`/api/bookings/${tokens.bookingCode}/status`),
      customer,
    ).send({ status: 'completed' })
    assert.equal(response.status, 403)
  })

  it('alur pembayaran tunai dikonfirmasi driver', async () => {
    const customer = await customerCookie()
    const driver = await driverCookie()

    const created = await auth(
      request(app).post(`/api/bookings/${tokens.bookingCode}/payment`),
      customer,
    ).send({ method: 'cash' })
    assert.equal(created.status, 201, created.text)
    assert.equal(created.body.data.booking.payment_status, 'pending')
    assert.equal(created.body.data.payment.method, 'cash')

    const customerConfirm = await auth(
      request(app).post(`/api/bookings/${tokens.bookingCode}/payment/confirm`),
      customer,
    ).send({})
    assert.equal(customerConfirm.status, 403)

    const driverConfirm = await auth(
      request(app).post(`/api/bookings/${tokens.bookingCode}/payment/confirm`),
      driver,
    ).send({})
    assert.equal(driverConfirm.status, 200, driverConfirm.text)
    assert.equal(driverConfirm.body.data.booking.payment_status, 'paid')
    assert.ok(driverConfirm.body.data.booking.paid_at)
    assert.equal(driverConfirm.body.data.payment.confirmation_source, 'driver')
    assert.equal(driverConfirm.body.data.payment.confirmed_by.role, 'driver')

    tokens.paymentId = driverConfirm.body.data.payment.id

    const payment = await auth(
      request(app).get(`/api/payments/${tokens.paymentId}`),
      customer,
    )
    assert.equal(payment.status, 200)
    assert.equal(payment.body.data.payment.booking_id, tokens.bookingCode)
    assert.equal(payment.body.data.payment.status, 'paid')
    assert.equal(payment.body.data.payment.confirmation_source, 'driver')
    assert.equal(payment.body.data.payment.confirmed_by.role, 'driver')
  })

  it('menolak pembayaran QRIS karena hanya tunai yang didukung', async () => {
    const customer = await customerCookie()
    const driver = await driverCookie()

    const created = await auth(request(app).post('/api/bookings'), customer).send({
      pickup: PLACES.dago,
      destination: PLACES.pvj,
      vehicle_type: 'motor',
      scheduled_at: new Date().toISOString(),
    })
    const code = created.body.data.booking.id

    await auth(request(app).post(`/api/bookings/${code}/accept`), driver)
    for (const status of ['arrived', 'in_progress', 'completed']) {
      await auth(request(app).patch(`/api/bookings/${code}/status`), driver).send({ status })
    }

    const payment = await auth(
      request(app).post(`/api/bookings/${code}/payment`),
      customer,
    ).send({ method: 'qris' })
    assert.equal(payment.status, 422)
  })

  it('mengirim perubahan pesanan dan lokasi driver lewat Socket.IO', async () => {
    const customer = await customerCookie()
    const driver = await driverCookie()
    const server = createServer(app)
    initRealtime(server)

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = server.address().port
    let customerSocket
    let driverSocket

    try {
      customerSocket = await connectSocket(customer, port)
      driverSocket = await connectSocket(driver, port)

      const customerUpdate = nextEvent(
        customerSocket,
        'booking:updated',
        (booking) => booking.status === 'pending',
      )
      const driverAvailable = nextEvent(driverSocket, 'booking:available')

      const created = await auth(request(app).post('/api/bookings'), customer).send({
        pickup: PLACES.dago,
        destination: PLACES.pvj,
        vehicle_type: 'motor',
        scheduled_at: new Date().toISOString(),
      })
      assert.equal(created.status, 201, created.text)
      const code = created.body.data.booking.id

      const [customerEvent, availableEvent] = await Promise.all([
        customerUpdate,
        driverAvailable,
      ])
      assert.equal(customerEvent.id, code)
      assert.equal(availableEvent.id, code)

      const assigned = nextEvent(
        customerSocket,
        'booking:updated',
        (booking) => booking.id === code && booking.status === 'accepted',
      )
      const accepted = await auth(
        request(app).post(`/api/bookings/${code}/accept`),
        driver,
      )
      assert.equal(accepted.status, 200, accepted.text)
      const assignedEvent = await assigned
      assert.equal(assignedEvent.driver_id, '2')

      const locationEvent = nextEvent(
        customerSocket,
        'driver:location',
        (location) => location.booking_id === code,
      )
      const locationAck = await new Promise((resolve) => {
        driverSocket.emit(
          'driver:location',
          { code, lat: -6.87, lng: 107.6 },
          resolve,
        )
      })
      assert.equal(locationAck.ok, true)

      const location = await locationEvent
      assert.equal(location.booking_id, code)
      assert.equal(location.lat, -6.87)
      assert.equal(location.lng, 107.6)

      const persisted = await auth(
        request(app).get(`/api/bookings/${code}/location`),
        customer,
      )
      assert.equal(persisted.status, 200, persisted.text)
      assert.equal(persisted.body.data.location.lat, -6.87)
      assert.equal(persisted.body.data.location.lng, 107.6)
    } finally {
      customerSocket?.disconnect()
      driverSocket?.disconnect()
      await closeRealtime()
      await new Promise((resolve) => server.close(resolve))
    }
  })

  it('membatasi detail pesanan dan pembayaran antar customer', async () => {
    const other = await login('dinda@demo.app')

    const booking = await auth(
      request(app).get(`/api/bookings/${tokens.bookingCode}`),
      other,
    )
    assert.equal(booking.status, 404)

    const payment = await auth(
      request(app).get(`/api/payments/${tokens.paymentId}`),
      other,
    )
    assert.equal(payment.status, 404)
  })

  it('membatalkan lalu menghapus permanen pesanan dengan aturan akses', async () => {
    const customer = await customerCookie()
    const driver = await driverCookie()
    const other = await login('dinda@demo.app')

    const created = await auth(request(app).post('/api/bookings'), customer).send({
      pickup: PLACES.dago,
      destination: PLACES.pvj,
      vehicle_type: 'motor',
      scheduled_at: new Date().toISOString(),
    })
    assert.equal(created.status, 201, created.text)
    const code = created.body.data.booking.id

    const forbidden = await auth(
      request(app).delete(`/api/bookings/${code}`),
      other,
    )
    assert.equal(forbidden.status, 403)

    const driverForbidden = await auth(
      request(app).delete(`/api/bookings/${code}`),
      driver,
    )
    assert.equal(driverForbidden.status, 403)

    const active = await auth(
      request(app).delete(`/api/bookings/${code}`),
      customer,
    )
    assert.equal(active.status, 409)

    const cancelled = await auth(
      request(app).post(`/api/bookings/${code}/cancel`),
      customer,
    )
    assert.equal(cancelled.status, 200, cancelled.text)
    assert.equal(cancelled.body.data.booking.status, 'cancelled')

    const { query } = await import('../src/db/pool.js')
    const bookingRow = await query('SELECT id FROM bookings WHERE code = $1', [code])
    await query(
      `INSERT INTO payments (booking_id, method, amount, status)
       VALUES ($1, 'cash', 0, 'failed')`,
      [bookingRow.rows[0].id],
    )

    const deleted = await auth(
      request(app).delete(`/api/bookings/${code}`),
      customer,
    )
    assert.equal(deleted.status, 200, deleted.text)
    assert.equal(deleted.body.data.code, code)

    const missing = await auth(
      request(app).get(`/api/bookings/${code}`),
      customer,
    )
    assert.equal(missing.status, 404)

    const bookings = await auth(request(app).get('/api/bookings'), customer)
    assert.ok(!bookings.body.data.bookings.some((booking) => booking.id === code))

    const remainingBooking = await query('SELECT COUNT(*)::int AS total FROM bookings WHERE code = $1', [
      code,
    ])
    const remainingPayment = await query(
      'SELECT COUNT(*)::int AS total FROM payments WHERE booking_id = $1',
      [bookingRow.rows[0].id],
    )
    assert.equal(remainingBooking.rows[0].total, 0)
    assert.equal(remainingPayment.rows[0].total, 0)

    const repeated = await auth(
      request(app).delete(`/api/bookings/${code}`),
      customer,
    )
    assert.equal(repeated.status, 404)
  })

  it('mendukung pagination pengguna dan pesanan', async () => {
    const admin = await adminCookie()

    const users = await auth(
      request(app).get('/api/users?role=customer&page=1&limit=1'),
      admin,
    )
    assert.equal(users.status, 200, users.text)
    assert.equal(users.body.data.users.length, 1)
    assert.equal(users.body.data.pagination.page, 1)
    assert.equal(users.body.data.pagination.limit, 1)
    assert.ok(users.body.data.pagination.total >= 1)

    const bookings = await auth(
      request(app).get('/api/bookings?page=1&limit=1'),
      admin,
    )
    assert.equal(bookings.status, 200, bookings.text)
    assert.equal(bookings.body.data.bookings.length, 1)
    assert.equal(bookings.body.data.pagination.limit, 1)
    assert.ok(bookings.body.data.pagination.total >= 1)
  })

  it('menyajikan notifikasi persisten dan status baca', async () => {
    const customer = await customerCookie()

    const first = await auth(
      request(app).get('/api/notifications?page=1&limit=1'),
      customer,
    )
    assert.equal(first.status, 200, first.text)
    assert.equal(first.body.data.notifications.length, 1)
    assert.equal(first.body.data.pagination.limit, 1)

    const notification = first.body.data.notifications[0]
    const read = await auth(
      request(app).patch(`/api/notifications/${notification.id}/read`),
      customer,
    )
    assert.equal(read.status, 200, read.text)
    assert.ok(read.body.data.notification.read_at)

    const readAll = await auth(
      request(app).patch('/api/notifications/read-all'),
      customer,
    )
    assert.equal(readAll.status, 200, readAll.text)

    const unread = await auth(
      request(app).get('/api/notifications?unread=1'),
      customer,
    )
    assert.equal(unread.status, 200, unread.text)
    assert.equal(unread.body.data.unread, 0)
  })

  it('hanya admin dapat mereset data demo', async () => {
    const customer = await customerCookie()
    const forbidden = await auth(
      request(app).post('/api/admin/reset-demo'),
      customer,
    )
    assert.equal(forbidden.status, 403)

    const admin = await adminCookie()
    const reset = await auth(request(app).post('/api/admin/reset-demo'), admin)
    assert.equal(reset.status, 200, reset.text)
    assert.equal(reset.body.data.users, 7)

    const bookings = await auth(request(app).get('/api/bookings'), admin)
    assert.equal(bookings.body.data.bookings.length, 9)
  })

  it('admin dapat mereset dan menghapus akun customer secara terpisah', async () => {
    const admin = await adminCookie()
    const email = `reset.customer.${Date.now()}@demo.app`
    const registration = await request(app).post('/api/auth/register').send({
      name: 'Customer Reset',
      email,
      phone: '081311122233',
      password: 'rahasia123',
      role: 'customer',
    })
    assert.equal(registration.status, 201, registration.text)
    const customerId = registration.body.data.user.id
    const customer = await login(email, 'rahasia123')

    const forbidden = await auth(
      request(app).post(`/api/admin/users/${customerId}/reset`),
      customer,
    )
    assert.equal(forbidden.status, 403)

    const created = await auth(request(app).post('/api/bookings'), customer).send({
      pickup: PLACES.itb,
      destination: PLACES.stasiun,
      vehicle_type: 'motor',
      scheduled_at: new Date().toISOString(),
    })
    assert.equal(created.status, 201, created.text)
    const code = created.body.data.booking.id

    const activeReset = await auth(
      request(app).post(`/api/admin/users/${customerId}/reset`),
      admin,
    )
    assert.equal(activeReset.status, 409, activeReset.text)

    const cancelled = await auth(
      request(app).post(`/api/bookings/${code}/cancel`),
      customer,
    )
    assert.equal(cancelled.status, 200, cancelled.text)

    const reset = await auth(
      request(app).post(`/api/admin/users/${customerId}/reset`),
      admin,
    )
    assert.equal(reset.status, 200, reset.text)
    assert.equal(reset.body.data.role, 'customer')
    assert.equal(reset.body.data.bookings_deleted, 1)

    const removed = await auth(request(app).get(`/api/bookings/${code}`), admin)
    assert.equal(removed.status, 404)

    const stillRegistered = await login(email, 'rahasia123')
    assert.ok(stillRegistered)

    const second = await auth(request(app).post('/api/bookings'), customer).send({
      pickup: PLACES.dago,
      destination: PLACES.pvj,
      vehicle_type: 'motor',
      scheduled_at: new Date().toISOString(),
    })
    assert.equal(second.status, 201, second.text)
    const secondCode = second.body.data.booking.id

    const secondCancel = await auth(
      request(app).post(`/api/bookings/${secondCode}/cancel`),
      customer,
    )
    assert.equal(secondCancel.status, 200, secondCancel.text)

    const deleted = await auth(
      request(app).delete(`/api/admin/users/${customerId}`),
      admin,
    )
    assert.equal(deleted.status, 200, deleted.text)

    const relogin = await request(app).post('/api/auth/login').send({
      email,
      password: 'rahasia123',
    })
    assert.equal(relogin.status, 401)

    const users = await auth(request(app).get('/api/users?role=customer'), admin)
    assert.equal(users.status, 200, users.text)
    assert.ok(users.body.data.users.every((user) => user.id !== customerId))
  })

  it('admin dapat membuat sandi sementara dan pengguna wajib menggantinya', async () => {
    const admin = await adminCookie()
    const email = `password.reset.${Date.now()}@demo.app`
    const registration = await request(app).post('/api/auth/register').send({
      name: 'Customer Sandi',
      email,
      phone: '081377788899',
      password: 'rahasia123',
      role: 'customer',
    })
    assert.equal(registration.status, 201, registration.text)
    const customerId = registration.body.data.user.id
    const customer = await login(email, 'rahasia123')

    const forbidden = await auth(
      request(app).post(`/api/admin/users/${customerId}/reset-password`),
      customer,
    )
    assert.equal(forbidden.status, 403)

    const reset = await auth(
      request(app).post(`/api/admin/users/${customerId}/reset-password`),
      admin,
    )
    assert.equal(reset.status, 200, reset.text)
    assert.equal(reset.body.data.user.id, customerId)
    const temporaryPassword = reset.body.data.temporary_password
    assert.equal(typeof temporaryPassword, 'string')
    assert.equal(temporaryPassword.length, 12)

    const oldLogin = await request(app).post('/api/auth/login').send({
      email,
      password: 'rahasia123',
    })
    assert.equal(oldLogin.status, 401)

    const temporaryLogin = await request(app).post('/api/auth/login').send({
      email,
      password: temporaryPassword,
    })
    assert.equal(temporaryLogin.status, 200, temporaryLogin.text)
    assert.equal(temporaryLogin.body.data.user.must_change_password, true)
    const temporaryCookie = cookieFrom(temporaryLogin)

    const blocked = await auth(
      request(app).get('/api/bookings'),
      temporaryCookie,
    )
    assert.equal(blocked.status, 403)
    assert.match(blocked.body.message, /sandi sementara/i)

    const me = await auth(request(app).get('/api/users/me'), temporaryCookie)
    assert.equal(me.status, 200, me.text)
    assert.equal(me.body.data.user.must_change_password, true)

    const wrongCurrent = await auth(
      request(app).patch('/api/users/me/password'),
      temporaryCookie,
    ).send({ currentPassword: 'salah123', newPassword: 'sandiBaru123' })
    assert.equal(wrongCurrent.status, 422, wrongCurrent.text)

    const changed = await auth(
      request(app).patch('/api/users/me/password'),
      temporaryCookie,
    ).send({ currentPassword: temporaryPassword, newPassword: 'sandiBaru123' })
    assert.equal(changed.status, 200, changed.text)
    assert.equal(changed.body.data.user.must_change_password, false)

    const allowed = await auth(
      request(app).get('/api/bookings'),
      temporaryCookie,
    )
    assert.equal(allowed.status, 200, allowed.text)

    const newLogin = await request(app).post('/api/auth/login').send({
      email,
      password: 'sandiBaru123',
    })
    assert.equal(newLogin.status, 200, newLogin.text)
    assert.equal(newLogin.body.data.user.must_change_password, false)

    const reusedTemporary = await request(app).post('/api/auth/login').send({
      email,
      password: temporaryPassword,
    })
    assert.equal(reusedTemporary.status, 401)

    const adminReset = await auth(
      request(app).post(`/api/admin/users/${customerId}/reset-password`),
      admin,
    )
    assert.equal(adminReset.status, 200, adminReset.text)

    const admins = await auth(request(app).get('/api/users?role=admin'), admin)
    assert.equal(admins.status, 200, admins.text)
    const adminId = admins.body.data.users[0].id
    const adminAccountReset = await auth(
      request(app).post(`/api/admin/users/${adminId}/reset-password`),
      admin,
    )
    assert.equal(adminAccountReset.status, 403, adminAccountReset.text)
  })

  it('admin dapat mereset dan menghapus akun driver secara terpisah', async () => {
    const admin = await adminCookie()
    const email = `reset.driver.${Date.now()}@demo.app`
    const registration = await request(app).post('/api/auth/register').send({
      name: 'Driver Reset',
      email,
      phone: '081344455566',
      password: 'rahasia123',
      role: 'driver',
      vehicleType: 'motor',
      plate: 'B 9090 RST',
    })
    assert.equal(registration.status, 201, registration.text)
    const driverId = registration.body.data.user.id

    const approved = await auth(
      request(app).patch(`/api/drivers/${driverId}/verification`),
      admin,
    ).send({ status: 'approved' })
    assert.equal(approved.status, 200, approved.text)

    const driver = await login(email, 'rahasia123')
    const reset = await auth(
      request(app).post(`/api/admin/users/${driverId}/reset`),
      admin,
    )
    assert.equal(reset.status, 200, reset.text)
    assert.equal(reset.body.data.role, 'driver')

    const users = await auth(request(app).get('/api/users?role=driver'), admin)
    const resetDriver = users.body.data.users.find((user) => user.id === driverId)
    assert.equal(resetDriver.vehicle.verification_status, 'pending')
    assert.equal(resetDriver.vehicle.availability_status, 'offline')
    assert.equal(resetDriver.vehicle.rating, 0)
    assert.equal(resetDriver.vehicle.total_trips, 0)

    const blockedLogin = await request(app).post('/api/auth/login').send({
      email,
      password: 'rahasia123',
    })
    assert.equal(blockedLogin.status, 403)

    const deleted = await auth(
      request(app).delete(`/api/admin/users/${driverId}`),
      admin,
    )
    assert.equal(deleted.status, 200, deleted.text)

    const relogin = await request(app).post('/api/auth/login').send({
      email,
      password: 'rahasia123',
    })
    assert.equal(relogin.status, 401)
    assert.ok(driver)
  })
})
