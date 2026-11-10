import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const requireFromBackend = createRequire(new URL('../backend/package.json', import.meta.url))
const { io } = requireFromBackend('socket.io-client')

const baseUrl = (process.env.APP_URL ?? 'http://localhost:8080').replace(/\/+$/, '')
const password = process.env.DEMO_PASSWORD ?? 'demo1234'

function pass(message) {
  console.log(`[ok] ${message}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function cookieValue(response) {
  const values = response.headers.getSetCookie?.() ?? [response.headers.get('set-cookie')]
  const raw = values.filter(Boolean)[0]
  assert(raw, 'Server tidak mengirim cookie sesi.')
  return raw.split(';')[0]
}

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  let body = null
  try {
    body = await response.json()
  } catch {
    body = null
  }
  return { response, body }
}

async function login(email) {
  const { response } = await json('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert(response.status === 200, `Login ${email} gagal (${response.status}).`)
  return cookieValue(response)
}

function socketReady(cookie) {
  const socket = io(baseUrl, {
    path: '/api/socket.io',
    transports: ['websocket'],
    extraHeaders: { Cookie: cookie },
    reconnection: false,
    forceNew: true,
  })

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.close()
      reject(new Error('Koneksi Socket.IO melewati batas waktu.'))
    }, 5000)

    socket.once('realtime:ready', (payload) => {
      clearTimeout(timer)
      socket.close()
      resolve(payload)
    })
    socket.once('connect_error', (error) => {
      clearTimeout(timer)
      socket.close()
      reject(error)
    })
  })
}

function databaseValue(sql) {
  return execFileSync(
    'docker',
    ['compose', 'exec', '-T', 'db', 'psql', '-U', 'ajt', '-d', 'ajt', '-Atc', sql],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' },
  ).trim()
}

const health = await json('/api/health')
assert(health.response.status === 200, 'Health check API gagal.')
assert(health.body?.data?.status === 'ok', 'Status health check tidak ok.')
pass('API health check')

const page = await fetch(baseUrl)
const html = await page.text()
assert(page.status === 200, 'Halaman frontend tidak dapat dibuka.')
assert(html.includes('id="root"'), 'HTML frontend tidak memuat aplikasi React.')
pass('frontend dan proxy nginx')

const anonymous = await json('/api/bookings')
assert(anonymous.response.status === 401, 'Endpoint terproteksi dapat diakses tanpa sesi.')
pass('proteksi endpoint tanpa sesi')

const customer = await login('customer@demo.app')
const me = await json('/api/auth/me', { headers: { Cookie: customer } })
assert(me.response.status === 200, 'Sesi customer tidak valid.')
assert(me.body?.data?.user?.role === 'customer', 'Role customer tidak sesuai.')
pass('login dan sesi customer')

const forbidden = await json('/api/users', { headers: { Cookie: customer } })
assert(forbidden.response.status === 403, 'Customer dapat membuka daftar pengguna admin.')
pass('otorisasi role customer')

const admin = await login('admin@demo.app')
const adminUsers = await json('/api/users', { headers: { Cookie: admin } })
assert(adminUsers.response.status === 200, 'Admin tidak dapat membuka daftar pengguna.')
pass('login dan otorisasi admin')

const driver = await login('driver@demo.app')
const customerSocket = await socketReady(customer)
const adminSocket = await socketReady(admin)
const driverSocket = await socketReady(driver)
assert(customerSocket.role === 'customer', 'Role socket customer tidak sesuai.')
assert(adminSocket.role === 'admin', 'Role socket admin tidak sesuai.')
assert(driverSocket.role === 'driver', 'Role socket driver tidak sesuai.')
pass('Socket.IO customer, admin, dan driver')

const removedWebhook = await json('/api/payments/webhooks/qris', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ provider_ref: 'SIM-TIDAK-ADA', amount: 1, status: 'paid' }),
})
assert([401, 404].includes(removedWebhook.response.status), 'Webhook QRIS masih tersedia.')
pass('webhook QRIS sudah dihapus')

const migration = databaseValue(
  "select count(*) from schema_migrations where name = '011_cash_only_payments.sql';",
)
const nonCashPayments = databaseValue(
  "select count(*) from payments where method <> 'cash';",
)
const nonCashBookings = databaseValue(
  "select count(*) from bookings where payment_method is not null and payment_method <> 'cash';",
)
assert(migration === '1', 'Migrasi 011 belum diterapkan pada database Docker.')
assert(nonCashPayments === '0', 'Masih ada pembayaran non-tunai.')
assert(nonCashBookings === '0', 'Masih ada pesanan non-tunai.')
pass('migrasi database dan normalisasi pembayaran tunai')

console.log('Smoke test stack lulus.')
