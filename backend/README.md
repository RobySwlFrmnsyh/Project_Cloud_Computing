# Backend — Anter Jemput Teman (Tahap 2)

REST API Express 5 + PostgreSQL 17 untuk aplikasi antar jemput. Semua data pengguna,
driver, pesanan, dan pembayaran disimpan di database; tidak ada state penting di klien.

## Menjalankan

```bash
cd backend
cp .env.example .env     # opsional, nilai default sudah bisa dipakai
npm install
npm run dev              # http://localhost:4000
```

Saat pertama kali dijalankan dengan `USE_EMBEDDED_DB=true`, backend akan:

1. menjalankan PostgreSQL 17 embedded pada `127.0.0.1:5433` (data di `.pgdata/`),
2. menjalankan migrasi tabel,
3. mengisi data demo bila database masih kosong.

Tidak perlu instalasi PostgreSQL atau Docker di mesin pengembangan.

### Perintah npm

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` / `npm start` | Menjalankan API (embedded DB otomatis) |
| `npm run db:migrate` | Menjalankan migrasi saja |
| `npm run db:seed` | Seed data demo bila database kosong |
| `npm run db:reset` | Hapus dan isi ulang data demo |
| `npm test` | Pengujian API (DB uji pada port 5434, `.pgdata-test`) |

## Konfigurasi (.env)

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `4000` | Port API |
| `NODE_ENV` | `development` | `production` mewajibkan `JWT_SECRET` |
| `USE_EMBEDDED_DB` | `true` (non-produksi) | Matikan untuk memakai PostgreSQL eksternal |
| `DATABASE_URL` | `postgres://ajt:ajt@127.0.0.1:5433/ajt` | Koneksi PostgreSQL |
| `PG_DATA_DIR` | `.pgdata` | Folder data embedded PostgreSQL |
| `JWT_SECRET` | dev-only | **Wajib diganti** pada produksi |
| `JWT_EXPIRES_IN` | `7d` | Masa berlaku sesi |
| `COOKIE_NAME` | `ajt_session` | Nama cookie sesi |
| `COOKIE_SECURE` | `false` (dev) | Set `true` di belakang HTTPS |
| `CORS_ORIGIN` | `http://localhost:5173` | Origin frontend yang diizinkan |
| `SEED_DEMO` | `true` | Seed otomatis saat database kosong |
| `ALLOW_DEMO_RESET` | `true` | Mengaktifkan reset demo admin |
| `ROAD_ROUTING_ENABLED` | `true` | Aktifkan routing jalan OSRM |
| `OSRM_BASE_URL` | `https://router.project-osrm.org` | Server OSRM publik |
| `ROUTING_TIMEOUT_MS` | `6000` | Timeout request routing sebelum fallback |

## Desain API

- Bentuk respons seragam: `{ "success": boolean, "message": string, "data": ... }`.
- Error validasi: HTTP 422 dengan `errors: { field: message }`.
- Autentikasi: JWT ditandatangani server dan dikirim lewat cookie httpOnly
  `ajt_session` (`sameSite=lax`) tanpa `Max-Age`, sehingga cookie berakhir saat sesi browser
  ditutup. Endpoint yang dilindungi memakai middleware `authenticate`; sebagian menambahkan
  `requireRole`.
- ID publik pesanan adalah kode `AJT-xxxx`; primary key numerik tidak diekspos.
  Detail pesanan menyertakan `customer`, `driver`, dan `payment` yang relevan.
- Tarif dihitung server dari **jarak rute jalan OSRM** (dibulatkan 0,1 km):
  motor Rp8.000 + Rp2.600/km, mobil Rp12.000 + Rp4.200/km, dibulatkan ke atas Rp500.
  Bila OSRM gagal/timeout, server memakai fallback haversine dan menandai
  `route_provider = 'haversine'`.
- Customer memilih lokasi bebas. Body `POST /api/bookings` memakai
  `pickup`/`destination` berbentuk `{ address, lat, lng }`; server memvalidasi alamat,
  rentang koordinat, dan memastikan kedua titik berbeda. Booking menyimpan alamat +
  koordinat langsung, sedangkan `pickup_location_id`/`destination_location_id` hanya
  dipertahankan untuk data lama dan boleh `null`. Rute menyimpan
  `route_geometry` (array `[lat,lng]`), `route_duration_minutes`, dan `route_provider`.
- `POST /api/routes/estimate` mengembalikan `{ distance_km, duration_minutes, geometry,
  provider }` untuk pratinjau peta. Endpoint ini memakai resolver rute yang sama dengan
  pembuatan booking sehingga estimasi dan tarif final konsisten.
- Status pesanan: `pending → accepted → arrived → in_progress → completed`, atau
  `cancelled` dari `pending`/`accepted`/`arrived`. Customer dapat mengubah pesanan
  `pending` yang belum memiliki driver; driver dapat menolak pesanan tersebut tanpa
  mengubah status global. Customer dapat memberi rating 1–5 setelah `completed`.
- Registrasi tidak membuat sesi. Customer harus login kembali setelah mendaftar; driver
  baru juga harus menunggu verifikasi admin.
- Status pembayaran: `unpaid`, `pending`, `paid`, `failed`, `expired`; metode yang
  diterima hanya `cash`. Customer mencatat pembayaran tunai lalu driver mengonfirmasi
  setelah uang diterima. Admin juga dapat mengonfirmasi. Kuitansi menyimpan sumber
  konfirmasi (`driver` atau `admin`) dan petugas yang mengonfirmasi. Seluruh alur
  pembayaran adalah **simulasi**, tanpa uang sungguhan.
- Socket.IO berjalan pada path `/api/socket.io` dengan autentikasi cookie sesi. Room
  dibatasi per pengguna, admin, dan jenis kendaraan. Event utama: `booking:updated`,
  `booking:available`, `booking:unavailable`, `booking:deleted`, `notification:new`,
  dan `driver:location`.

## Endpoint

```
GET    /api/health
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/users/me
PATCH  /api/users/me
PATCH  /api/users/me/password
GET    /api/users                     (admin)
GET    /api/locations
POST   /api/routes/estimate
GET    /api/drivers
PATCH  /api/drivers/me/availability   (driver)
PATCH  /api/drivers/:userId/verification (admin)
GET    /api/bookings
POST   /api/bookings                  (customer)
GET    /api/bookings/:code
PUT    /api/bookings/:code            (customer, pending tanpa driver)
GET    /api/bookings/:code/location
POST   /api/bookings/:code/accept     (driver)
POST   /api/bookings/:code/decline    (driver)
PATCH  /api/bookings/:code/status     (driver)
POST   /api/bookings/:code/rating     (customer, completed)
POST   /api/bookings/:code/cancel
GET    /api/bookings/:code/payment
POST   /api/bookings/:code/payment
POST   /api/bookings/:code/payment/confirm
GET    /api/payments/:id
GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
POST   /api/admin/users/:userId/reset (admin)
POST   /api/admin/users/:userId/reset-password (admin)
DELETE /api/admin/users/:userId       (admin)
POST   /api/admin/reset-demo          (admin, reset seluruh data demo)
```

## Struktur

```
src/
  app.js            # middleware, mount router, error handler
  server.js         # bootstrap, embedded DB, migrasi, seed
  config.js         # pembacaan env
  routes/           # auth, users, bookings, routes, payments, drivers, locations, notifications, admin
  middleware/       # authenticate/requireRole, error handler
  services/         # query baca pengguna dan pesanan
  lib/              # schema Zod, serializer, fare, routing, session, realtime, http
  db/               # pool, embedded postgres, migrasi, seed
test/api.test.js    # 32 pengujian API + Socket.IO dengan node:test + supertest
```

## Pengujian

```bash
npm test
```

Pengujian memakai database terpisah (port 5434) dan mencakup registrasi tanpa sesi
otomatis, login, cookie sesi, validasi, duplikasi email, driver pending, otorisasi admin,
parsing rute OSRM,
estimasi rute, perhitungan tarif server, transisi status, pembayaran tunai, penolakan
metode QRIS, event Socket.IO, notifikasi, rating, pagination, update/decline pesanan,
akses lintas pengguna, dan reset demo. Test mematikan
routing jaringan (`ROAD_ROUTING_ENABLED=false`) agar deterministik dan tidak bergantung
internet.

## Catatan keamanan

- Password di-hash bcrypt (10 rounds) dan tidak pernah diserialisasi.
- Semua input divalidasi dengan Zod; parameter rute dan query juga diparse.
- Helmet dipasang untuk header keamanan dasar, CORS dibatasi ke origin frontend, dan
  body JSON dibatasi 100 kB.
- Pembayaran hanya menerima metode tunai; schema menolak metode lain sebelum data
  pembayaran dibuat.
- Rate limit global dan percobaan login dibatasi per IP; nilainya dapat diatur lewat
  `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, dan `AUTH_RATE_LIMIT_MAX`.
- Deployment memakai Docker Compose di belakang nginx. HTTPS belum diterapkan; akses
  masih HTTP pada jaringan lokal VM.
