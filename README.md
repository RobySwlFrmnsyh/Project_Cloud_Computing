# Anter Jemput Teman — Tahap 6

Aplikasi antar jemput untuk **customer**, **driver**, dan **admin** dengan antarmuka React
dan backend REST API + PostgreSQL. Tahap 2 menghubungkan seluruh halaman ke API
sungguhan; Tahap 3 menjalankan seluruh stack di dalam VM menggunakan Docker Compose;
Tahap 4 menambahkan peta interaktif Leaflet/OpenStreetMap dengan cakupan seluruh
Indonesia, pencarian alamat nasional dengan saran saat mengetik, serta jarak dan garis
rute yang mengikuti jalan melalui layanan OSRM. Tahap 5 menambahkan pembaruan status
pesanan dan lokasi driver secara realtime dengan Socket.IO serta pencatatan pembayaran
tunai simulasi yang dikonfirmasi driver. Tahap 6 melengkapi
pengujian API, pengujian UI headless, koleksi Postman, pemeriksaan persistensi Docker,
screenshot, dan dokumentasi akhir. Penyempurnaan terakhir menambahkan edit pesanan
pending, penolakan pesanan oleh driver, notifikasi persisten, rating driver, lokasi
driver yang tersimpan, pagination, serta rate limiting.

## Arsitektur

| Bagian | Teknologi |
| --- | --- |
| Frontend | React 19 + Vite 8 + Leaflet/react-leaflet, disajikan nginx (`frontend/`) |
| Backend | Node.js + Express 5, ESM (`backend/`) |
| Database | PostgreSQL 17 (container `db`, volume persisten `pgdata`) |
| Autentikasi | JWT di cookie `ajt_session` (httpOnly, sameSite=lax) |
| Validasi | Zod di server + validasi formulir di klien |
| Deployment | Docker Compose (`docker-compose.yml`) |

Alur request pada Docker: browser → nginx (`:8080`) → proxy `/api` → Express (`backend:4000`)
→ PostgreSQL (`db:5432`) melalui jaringan internal `ajt`. Frontend dan API berada pada
origin yang sama, sehingga tidak ada masalah CORS untuk pemakaian normal.

## Menjalankan dengan Docker Compose

Prasyarat: Docker Engine aktif dan plugin `docker compose` v2. Jika belum tersedia:

```bash
sudo apt install docker-compose   # paket plugin v2 pada Kali/Debian
docker compose version
```

```bash
cd /home/roby/ProjectCC
cp .env.example .env          # lalu ganti POSTGRES_PASSWORD dan JWT_SECRET
docker compose up -d --build  # build image + jalankan db, backend, frontend
docker compose ps             # cek status healthy
```

Hasil:

| Layanan | Alamat | Keterangan |
| --- | --- | --- |
| Frontend | `http://localhost:8080` | nginx, sekaligus proxy `/api` |
| API | `http://localhost:4000` | akses langsung untuk uji/Postman |
| Adminer | `http://localhost:8081` | viewer database berbasis web |
| PostgreSQL | internal `db:5432` | tidak dipublikasikan ke host |

Backend otomatis menjalankan migrasi dan mengisi data demo saat volume masih kosong.
Perintah operasional:

```bash
docker compose logs -f backend   # lihat log API/migrasi
docker compose logs -f frontend  # log nginx
docker compose logs -f adminer   # log viewer database
docker compose restart backend   # restart satu layanan
docker compose down              # hentikan container (volume & data tetap ada)
docker compose down -v           # hentikan dan hapus volume database (data hilang)
docker compose up -d --build     # rebuild setelah kode berubah
```

Konfigurasi rahasia (password database, `JWT_SECRET`, port, origin CORS) dibaca dari
`.env` di root proyek. Jangan commit file tersebut.

Pencarian alamat memakai **Mapbox Geocoding** lebih dulu bila `MAPBOX_ACCESS_TOKEN`
tersedia dan valid. Token harus memiliki scope geocoding; untuk pemakaian server-side,
gunakan token yang tidak dibatasi URL atau secret token Mapbox. Bila Mapbox tidak
tersedia, backend mencoba **Google Places** (jika `GOOGLE_MAPS_API_KEY` diisi dengan
billing aktif), lalu otomatis memakai Photon + Nominatim. Semua token/key hanya dipakai
backend dan tidak dikirim ke browser.

## Melihat database (Adminer)

Service `adminer` menyediakan tampilan visual untuk database tanpa membuka port
PostgreSQL ke host. Buka `http://localhost:8081`, lalu login:

| Isian | Nilai |
| --- | --- |
| System | PostgreSQL |
| Server | `db` |
| Username | nilai `POSTGRES_USER` (default `ajt`) |
| Password | nilai `POSTGRES_PASSWORD` di `.env` |
| Database | nilai `POSTGRES_DB` (default `ajt`) |

Data dictionary lengkap ada pada `PRD_ProjectCC.md` bagian 3.3. Adminer hanya untuk
lingkungan lokal/demo; jangan mengekspos port `8081` ke internet.

## Peta interaktif (Tahap 4)

Peta memakai **Leaflet** + **react-leaflet** dengan tile **OpenStreetMap** dan tampilan
awal seluruh Indonesia. Customer tidak lagi terikat pada daftar lokasi preset: titik
jemput dan tujuan dipilih bebas di dalam Indonesia, baik dengan mengetik alamat maupun
langsung dari peta.

- **Buat pesanan** (`/app/bookings/new`): ketik minimal 2 karakter pada kolom titik
  jemput atau tujuan untuk melihat saran alamat. Pencarian mencakup nama jalan, dusun,
  desa/kelurahan, kecamatan, dan tempat. Saran memakai Mapbox lebih dulu, lalu Google
  bila aktif, lalu Photon dengan pelengkap Nominatim. Nominatim dibatasi ke Indonesia
  dan diberi jeda minimal 1,1 detik antarpermintaan; hasil non-Indonesia dibuang.
- Pencarian dan reverse geocoding diproksikan melalui `/api/geocode/*` dengan urutan
  provider **Mapbox → Google Places → Photon + Nominatim**. Mapbox memakai Geocoding API
  v6, Google memakai Places Autocomplete (New), Place Details, dan Google Geocoding.
  Bila token/key kosong, tidak valid, atau provider gagal, backend lanjut ke provider
  berikutnya. Token tidak pernah masuk ke bundle frontend.
- Titik jemput dan tujuan dapat dicari, diklik langsung di peta, atau digeser setelah
  penanda muncul. Reverse geocoding backend mengisi alamat titik dengan urutan provider
  yang sama; bila semua gagal, koordinat tetap dipakai sebagai label.
  Tombol **Gunakan lokasi saya** memakai GPS perangkat dan memerlukan izin browser.
- Peta dapat diganti antara tampilan **Peta** (OpenStreetMap) dan **Satelit** (Esri World
  Imagery). Tersedia tombol zoom, skala, dan peta aktif otomatis mendekat ke titik yang
  dipilih. Titik aktif berpindah ke tujuan setelah titik jemput dipilih.
- Jarak, durasi, dan garis rute mengikuti jalan melalui **OSRM publik**. Frontend
  meminta estimasi ke `POST /api/routes/estimate`, lalu server memakai perhitungan yang
  sama saat booking dibuat. Bila OSRM tidak tersedia, server memakai fallback haversine
  dan UI menampilkan peringatan bahwa estimasi memakai garis lurus.
- **Landing, dashboard customer, detail perjalanan, detail pesanan driver**: peta
  menampilkan titik jemput/tujuan, garis rute jalan, serta jarak dan durasi dari booking.
- Booking baru menyimpan alamat + koordinat langsung di kolom `pickup_address`,
  `pickup_latitude`, `pickup_longitude`, `destination_address`, `destination_latitude`,
  dan `destination_longitude` (migrasi `002_freeform_booking_locations.sql`). Geometri
  rute, durasi, dan provider disimpan di `route_geometry`, `route_duration_minutes`, dan
  `route_provider` (migrasi `003_road_routing.sql`). Kolom
  `pickup_location_id`/`destination_location_id` tetap ada untuk data lama dan kini
  opsional.
- `POST /api/bookings` menerima `pickup` dan `destination` berbentuk
  `{ address, lat, lng }`; jarak dan tarif tetap dihitung server.
- Peta, pencarian alamat, dan OSRM membutuhkan internet. Bila tile gagal dimuat, penanda
  dan garis rute tetap tampil di atas latar peta kosong.

## Realtime dan pembayaran (Tahap 5)

Kanal realtime memakai **Socket.IO** pada path `/api/socket.io`, diautentikasi dengan
cookie sesi yang sama seperti REST API. Nginx meneruskan koneksi WebSocket ke backend.
Frontend berlangganan event berikut:

- `booking:updated` — status atau data pesanan berubah untuk customer, driver terkait,
  dan admin.
- `booking:available` — pesanan baru untuk driver dengan jenis kendaraan yang cocok.
- `booking:unavailable` — pesanan diambil driver lain atau dibatalkan.
- `booking:deleted` — pesanan yang sudah dibatalkan dihapus permanen.
- `driver:location` — posisi driver yang dibagikan selama perjalanan aktif, hanya untuk
  customer pemilik pesanan dan admin.

Driver dapat menyalakan **Bagikan lokasi saya** di detail pesanan aktif. Customer melihat
titik driver di peta dan waktu pembaruan terakhir tanpa memuat ulang halaman.

Pembayaran memakai alur tunai simulasi yang dikonfirmasi driver:

- Setelah perjalanan berstatus `completed`, customer mencatat pembayaran tunai lewat
  halaman pembayaran. Status pembayaran menjadi `pending` dan driver menerima notifikasi.
- Driver mengonfirmasi bahwa uang tunai sudah diterima. Status berubah menjadi `paid`
  dan kuitansi mencatat driver yang mengonfirmasi.
- Customer hanya dapat mencatat pembayaran; konfirmasi tunai dilakukan driver atau admin.
- Kuitansi pembayaran memuat nomor pembayaran, ID pesanan, metode tunai, nominal, waktu
  bayar, dan pihak yang mengonfirmasi. Driver dapat membuka kembali kuitansi dari
  **Riwayat** pesanan.
- Tidak ada QRIS, webhook penyedia, atau simulator pembayaran nontunai.

## Akses dari Windows (VM)

Dengan VirtualBox NAT, tambahkan port forwarding pada VM:

| Nama | Protocol | Host IP | Host Port | Guest Port |
| --- | --- | --- | --- | --- |
| SSH | TCP | 127.0.0.1 | 2222 | 22 |
| Frontend | TCP | 127.0.0.1 | 8080 | 8080 |
| Adminer | TCP | 127.0.0.1 | 8081 | 8081 |
| API (opsional) | TCP | 127.0.0.1 | 4000 | 4000 |

Lalu buka `http://localhost:8080` dari browser Windows. Alternatif tanpa port forwarding:
buka `http://localhost:8080` dari browser di dalam VM. Bila memakai IP VM langsung
(misalnya mode bridged), tambahkan origin tersebut ke `CORS_ORIGIN` di `.env`, contoh
`http://192.168.1.10:8080`, lalu `docker compose up -d` ulang.

## Pengembangan lokal tanpa Docker

Prasyarat: Node.js 20+ dan npm. Docker tidak diperlukan.

```bash
# Terminal 1 — backend + database
cd backend
cp .env.example .env
npm install
npm run dev

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173/`. Backend berjalan di `http://localhost:4000`.

Backend otomatis menjalankan PostgreSQL 17 embedded pada `127.0.0.1:5433` (data di
`backend/.pgdata`), menjalankan migrasi, dan mengisi data demo bila database kosong.

## Akun demo

Semua kata sandi: `demo1234`

| Peran | Email | Catatan |
| --- | --- | --- |
| Customer | `customer@demo.app` | Perjalanan aktif + riwayat |
| Driver | `driver@demo.app` | Terverifikasi, online |
| Admin | `admin@demo.app` | Verifikasi driver & kelola akun |
| Driver pending | `agus@demo.app` | Tidak bisa login sebelum disetujui admin |
| Driver mobil | `rina@demo.app` | Terverifikasi, offline |

Admin dapat mereset atau menghapus data **satu akun customer/driver** melalui
**Dashboard admin → Pengguna**. Akun admin tidak dapat dikelola dari aksi ini, dan akun
yang masih memiliki pesanan aktif harus diselesaikan atau dibatalkan terlebih dahulu.
Reset data demo menyeluruh tetap tersedia untuk pemeliharaan melalui
`POST /api/admin/reset-demo`.

Admin juga dapat membuat **sandi sementara** untuk satu akun customer/driver melalui
aksi **Sandi** pada tab **Pengguna**. Sandi sementara ditampilkan satu kali dan harus
disampaikan secara manual karena aplikasi belum memiliki layanan email/SMS. Pengguna
yang memakai sandi sementara wajib menggantinya sebelum dapat mengakses dashboard.

## Endpoint utama

Semua respons memakai bentuk `{ success, message, data }`.

| Method | Endpoint | Akses |
| --- | --- | --- |
| POST | `/api/auth/register` | Publik (driver berstatus pending) |
| POST | `/api/auth/login` | Publik (driver pending/rejected ditolak) |
| POST | `/api/auth/logout` | Sesi aktif |
| GET | `/api/auth/me` | Sesi aktif |
| GET/PATCH | `/api/users/me` | Sesi aktif |
| PATCH | `/api/users/me/password` | Sesi aktif |
| GET | `/api/users` | Admin |
| GET | `/api/locations` | Sesi aktif (data lama) |
| GET | `/api/geocode/status` | Sesi aktif |
| GET | `/api/geocode/search` | Sesi aktif |
| GET | `/api/geocode/places/:placeId` | Sesi aktif (butuh Google Places) |
| GET | `/api/geocode/reverse` | Sesi aktif |
| POST | `/api/routes/estimate` | Sesi aktif |
| GET | `/api/bookings` | Terfilter per peran |
| POST | `/api/bookings` | Customer |
| GET | `/api/bookings/:code` | Pemilik, driver terkait, admin |
| PUT | `/api/bookings/:code` | Customer pemilik, status `pending` tanpa driver |
| POST | `/api/bookings/:code/accept` | Driver terverifikasi & online |
| POST | `/api/bookings/:code/decline` | Driver terverifikasi & online |
| PATCH | `/api/bookings/:code/status` | Driver pemilik pesanan |
| POST | `/api/bookings/:code/rating` | Customer pemilik, status `completed` |
| GET | `/api/bookings/:code/location` | Pemilik, driver terkait, admin |
| POST | `/api/bookings/:code/cancel` | Customer/admin (soft delete) |
| DELETE | `/api/bookings/:code` | Customer pemilik/admin, hanya status `cancelled` (hard delete) |
| POST | `/api/bookings/:code/payment` | Customer/admin/driver; hanya metode tunai |
| POST | `/api/bookings/:code/payment/confirm` | Driver/admin (tunai) |
| GET | `/api/bookings/:code/payment` | Pemilik, driver terkait, admin |
| GET | `/api/payments/:id` | Pemilik, driver terkait, admin |
| GET | `/api/notifications` | Sesi aktif (pagination/unread opsional) |
| PATCH | `/api/notifications/:id/read` | Pemilik notifikasi |
| PATCH | `/api/notifications/read-all` | Sesi aktif |
| GET | `/api/drivers` | Admin |
| PATCH | `/api/drivers/me/availability` | Driver |
| PATCH | `/api/drivers/:userId/verification` | Admin |
| POST | `/api/admin/users/:userId/reset` | Admin; reset data satu customer/driver |
| POST | `/api/admin/users/:userId/reset-password` | Admin; buat sandi sementara |
| DELETE | `/api/admin/users/:userId` | Admin; hapus satu akun customer/driver |
| POST | `/api/admin/reset-demo` | Admin; reset seluruh data demo |

## Keamanan dan aturan server

- Password di-hash dengan bcrypt; hash tidak pernah dikirim ke browser.
- Registrasi customer tidak membuat sesi otomatis; pengguna harus login dengan akun baru.
- Sesi JWT di cookie httpOnly tanpa `Max-Age` (session cookie); tidak ada token di
  `localStorage`. Frontend mengakhiri sesi pada setiap pembukaan/reload halaman sehingga
  pengguna harus login lagi.
- Reset sandi oleh admin menandai `must_change_password`; middleware memblokir seluruh
  endpoint selain data sesi, logout, dan ganti sandi sampai pengguna menyimpan sandi baru.
- Semua input divalidasi ulang di server (Zod) dengan pesan error per field.
- Tarif dan jarak dihitung di server dari rute jalan OSRM (fallback haversine bila
  layanan tidak tersedia) + tarif per kendaraan; nilai dari klien diabaikan.
- Perpindahan status pesanan dibatasi server (`pending → accepted → arrived →
  in_progress → completed`, pembatalan hanya pada status awal).
- `DELETE /api/bookings/:code` hanya menerima pesanan berstatus `cancelled`. Customer
  hanya dapat menghapus pesanannya sendiri, admin dapat menghapus pesanan siapa pun,
  dan driver tidak dapat menghapus pesanan. Data pembayaran ikut terhapus melalui
  `ON DELETE CASCADE`.
- Pembayaran hanya mendukung tunai. Customer mencatat pembayaran, sedangkan driver atau
  admin mengonfirmasi setelah uang diterima. Server menolak metode lain.
- Koneksi Socket.IO memakai cookie sesi dan room terbatas; driver pending/rejected tidak
  dapat terhubung. Event `notification:new` hanya dikirim ke room pengguna penerima.
- Rate limit API dan percobaan login dibatasi per IP. Batas dapat diatur lewat
  `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, dan `AUTH_RATE_LIMIT_MAX`.
- `HOST_BIND` menentukan interface host yang mengekspos port Docker. Gunakan
  `127.0.0.1` bila aplikasi hanya diakses dari mesin yang sama.
- Driver `pending`/`rejected` tidak dapat login atau menerima pesanan.

## Batasan saat ini

- **Pembayaran masih simulasi.** Tunai tidak melibatkan uang sungguhan maupun payment
  gateway. Tidak ada integrasi QRIS atau penyedia pembayaran lain.
- Peta memakai tile OpenStreetMap/Esri. Pencarian memakai Mapbox lebih dulu, lalu Google
  Places/Geocoding bila aktif, lalu Photon + Nominatim; reverse geocoding mengikuti urutan
  yang sama. Semuanya membutuhkan internet dan tunduk pada kuota/kebijakan provider.
  Belum ada tile proxy, mode offline, atau geocoder mandiri.
- Token Mapbox harus valid dan memiliki scope geocoding. Bila token ditolak atau kuota
  habis, hasil otomatis berasal dari provider berikutnya; kualitas dan kelengkapan alamat
  bergantung pada data provider yang aktif.
- Alamat hasil reverse geocoding bisa kurang presisi; pengguna tetap dapat memilih titik
  lain atau mencari ulang. Rute dan tarif bergantung pada **OSRM publik**; bila layanan
  tidak tersedia, aplikasi kembali memakai jarak garis lurus. Pemakaian OSRM, Photon,
  Nominatim, dan Esri publik tunduk pada kebijakan layanan masing-masing dan belum ada
  instance mandiri. Rute sangat panjang/lintas pulau dapat gagal dan memakai fallback.
- Deployment masih HTTP di jaringan lokal VM; HTTPS belum diterapkan.
- Docker Compose mencakup empat layanan (frontend, adminer, backend, database), tanpa
  reverse proxy tambahan, monitoring, atau CI/CD. Adminer sebaiknya hanya diekspos ke
  `127.0.0.1` atau dihapus pada deployment nyata.

## Pengujian

Laporan lengkap, matriks hasil, dan screenshot tersedia di
[`docs/TAHAP6_PENGUJIAN_DAN_DOKUMENTASI.md`](docs/TAHAP6_PENGUJIAN_DAN_DOKUMENTASI.md).

```bash
cd backend
npm test        # 32 pengujian API (auth, validasi, rute, transisi, pembayaran, kuitansi, notifikasi, Socket.IO)

cd ../frontend
npm run lint
npm run build

cd ..
node scripts/smoke-stack.mjs          # health, login, role, Socket.IO, migrasi
node scripts/capture-screenshots.mjs  # UI smoke + screenshot Chromium headless
node scripts/test-delete-ui.mjs       # UI hapus permanen pesanan cancelled
./scripts/persistence-check.sh        # restart stack tanpa menghapus volume
```

Koleksi REST API untuk Postman tersedia di `postman/`. Koleksi utama mencakup 39
endpoint REST (63 request, 100 assertion), sedangkan koleksi reset demo dipisahkan
karena destruktif dan menambah 1 endpoint (2 request, 4 assertion). Total cakupan:
40 endpoint, 65 request, 104 assertion. Panduan demo lengkap, termasuk akses dari
Windows melalui port forwarding VirtualBox, ada di [`docs/DEMO_POSTMAN.md`](./docs/DEMO_POSTMAN.md).

Contoh menjalankan koleksi utama dengan Newman:

```bash
npx newman run postman/AnterJemputTeman.postman_collection.json \
  -e postman/AnterJemputTeman.postman_environment.json
```

Reset demo terpisah (destruktif, menghapus akun dan data):

```bash
npx newman run postman/AnterJemputTeman-ResetDemo.postman_collection.json \
  -e postman/AnterJemputTeman.postman_environment.json
```

Hasil pengujian terakhir: koleksi utama 63/63 request dan 100/100 assertion lulus,
9 pemeriksaan smoke stack lulus, UI hapus permanen lulus, dan jumlah data database
tetap sama setelah container Docker dibuat ulang. Jangan jalankan reset demo jika
ada akun registrasi yang ingin dipertahankan.

Pemeriksaan stack Docker:

```bash
docker compose ps
curl http://localhost:8080/api/health
docker compose logs --tail=50
```

## Struktur proyek

```
docker-compose.yml   # db + adminer + backend + frontend, volume pgdata, jaringan ajt
.env.example         # contoh konfigurasi root (port, secret, CORS)
docs/                # laporan Tahap 6 dan screenshot aplikasi
postman/             # koleksi dan environment REST API
scripts/             # smoke stack, capture screenshot, persistence check
backend/
  Dockerfile         # image produksi Node (tanpa devDependencies)
  src/
    routes/          # auth, users, bookings, payments, drivers, locations, admin
    middleware/      # autentikasi, error handler
    lib/             # schema Zod, serializer, fare, session, realtime Socket.IO
    db/              # pool, embedded postgres, migrasi, seed
  test/              # pengujian API + Socket.IO (node:test + supertest)
frontend/
  Dockerfile         # multi-stage: build Vite lalu sajikan dengan nginx
  nginx.conf         # SPA fallback + proxy /api dan WebSocket /api/socket.io
  src/
    context/         # AuthContext, DataContext (API + Socket.IO)
    components/      # UI dasar, layout, komponen booking
    pages/           # halaman per peran: customer, driver, admin, shared
    lib/             # API client, konstanta, format, fare
    styles/          # token + komponen + layout + halaman
```
