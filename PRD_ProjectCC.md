# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Anter Jemput Teman

**Versi:** 2.0  
**Tanggal:** 10 November 2026  
**Status:** Implementasi selesai — pembayaran tunai, realtime Socket.IO, notifikasi, rating, pengelolaan akun admin, dan geocoding multi-provider  
**Platform:** Web Application  
**Lingkungan pengembangan:** Windows + VS Code Remote SSH + Kali Linux VM + Docker Compose  
**Teknologi utama:** React 19, Vite 8, Node.js 22, Express 5, PostgreSQL 17, Socket.IO, Leaflet, Docker Compose, nginx

---

# 1. Ringkasan Produk

## 1.1 Deskripsi Produk

Anter Jemput Teman merupakan aplikasi transportasi berbasis web yang dirancang untuk memfasilitasi pemesanan layanan antar-jemput antara pelanggan dan pengemudi. Aplikasi ini memungkinkan pengguna membuat akun sebagai customer atau driver, melakukan pemesanan perjalanan, melihat status pesanan, dan mengelola informasi perjalanan melalui antarmuka yang interaktif.

Aplikasi dikembangkan dengan pendekatan web modern yang memisahkan frontend, backend, dan database. Deployment menggunakan pendekatan hybrid, yaitu Kali Linux sebagai Virtual Machine (VM) yang menjalankan layanan aplikasi melalui Docker Compose.

Penerapan tersebut sekaligus mendemonstrasikan konsep cloud computing skala lokal: virtualisasi (VM), containerization (Docker), orkestrasi (Docker Compose), penyimpanan persisten (volume), isolasi jaringan internal, healthcheck, serta konsumsi layanan SaaS untuk peta, geocoding, dan routing.

Selain memenuhi kebutuhan fungsional aplikasi, proyek ini ditujukan untuk memenuhi persyaratan tugas pengembangan aplikasi berbasis database, REST API, jaringan, container, dan deployment lokal.

## 1.2 Latar Belakang

Layanan transportasi digital membutuhkan sistem yang mampu menghubungkan pelanggan dengan pengemudi melalui proses pemesanan yang mudah, informasi perjalanan yang jelas, dan pengelolaan data yang terstruktur.

Anter Jemput Teman dikembangkan sebagai proyek aplikasi transportasi sederhana dengan konsep pemesanan perjalanan, pengelolaan akun berdasarkan peran, pemantauan status perjalanan secara realtime, notifikasi, rating, serta pembayaran tunai yang dikonfirmasi driver. Metode pembayaran dibatasi ke tunai; QRIS dan payment gateway tidak termasuk dalam implementasi saat ini.

Pengembangan dilakukan secara bertahap: fondasi UI, API, dan database diselesaikan lebih dulu, lalu dilengkapi peta interaktif, geocoding multi-provider, routing OSRM, pembaruan status realtime, notifikasi, rating, dan pengelolaan akun oleh admin.

## 1.3 Tujuan Produk

1. Menyediakan antarmuka pemesanan transportasi yang mudah digunakan.
2. Memungkinkan pengguna mendaftar dan login sebagai customer atau driver.
3. Mengimplementasikan operasi CRUD yang terhubung dengan database.
4. Menyediakan REST API dengan respons JSON.
5. Menjalankan aplikasi secara lokal menggunakan VM dan Docker.
6. Menyediakan peta interaktif, pencarian alamat multi-provider, estimasi rute, pembaruan status realtime, notifikasi, rating, dan pembayaran tunai.
7. Menghasilkan dokumentasi teknis yang dapat digunakan untuk pengujian dan penilaian tugas.

## 1.4 Target Pengguna

- **Customer:** pengguna yang membutuhkan layanan antar-jemput.
- **Driver:** pengemudi yang menerima dan menyelesaikan pesanan perjalanan.
- **Admin:** pengelola yang memantau data pengguna, status verifikasi driver, pesanan, dan transaksi.

## 1.5 Ruang Lingkup Produk

### Termasuk dalam pengembangan

- UI/UX responsif untuk desktop dan perangkat seluler.
- Registrasi, login, logout, dan perubahan kata sandi (termasuk kata sandi sementara).
- Pengelolaan peran pengguna: customer, driver, dan admin.
- Dashboard customer, driver, dan admin.
- CRUD pesanan: membuat, mengubah pesanan `pending`, membatalkan, dan menghapus permanen pesanan `cancelled`.
- Alur driver: verifikasi admin, status online/offline, menerima atau menolak pesanan, serta transisi status perjalanan.
- Database PostgreSQL dengan migrasi otomatis dan data demo.
- REST API dengan respons JSON dan validasi server.
- Deployment melalui Docker Compose di dalam VM, termasuk nginx, Adminer, healthcheck, dan volume persisten.
- Peta interaktif Leaflet/OpenStreetMap dengan pencarian alamat Mapbox, Google Places, Photon, dan Nominatim.
- Estimasi rute OSRM dengan fallback haversine, penyimpanan geometri rute, dan tarif dihitung server.
- Pembaruan status pesanan dan lokasi driver secara realtime melalui Socket.IO.
- Notifikasi persisten, rating driver, pagination, dan rate limiting.
- Pembayaran tunai: customer mencatat pembayaran, driver atau admin mengonfirmasi.
- Pengelolaan akun oleh admin: verifikasi driver, reset data akun, sandi sementara, hapus akun, dan reset data demo.
- Dokumentasi deployment, pengujian, dan demo Postman.

### Di luar ruang lingkup versi awal

- Aplikasi native Android atau iOS.
- Pembayaran nontunai (QRIS, payment gateway, atau integrasi perbankan).
- Algoritma pencocokan driver kompleks dan perhitungan tarif dinamis berbasis permintaan.
- Infrastruktur produksi berskala besar, auto-scaling, dan multi-region.
- HTTPS/TLS produksi, monitoring terpusat, dan backup otomatis.

---

# 2. Tahap 1 — Perancangan UI/UX

## 2.1 Tujuan Tahap 1

Membuat rancangan tampilan dan navigasi aplikasi sebelum implementasi backend dan database dilakukan. Pada tahap ini, pengguna harus dapat memahami alur aplikasi dan berpindah antarahalaman dengan mudah.

## 2.2 Prinsip Desain

- Modern, bersih, dan profesional.
- Responsif untuk desktop dan perangkat seluler.
- Navigasi yang konsisten.
- Formulir dengan validasi dan pesan kesalahan yang jelas.
- Status perjalanan dan pembayaran mudah dibedakan.
- Tampilan loading, kosong, berhasil, dan gagal tersedia.
- Warna dan komponen visual konsisten pada seluruh halaman.
- Animasi halus dan interaksi hover secukupnya, tetap menghormati `prefers-reduced-motion`.

**Arah visual:** aplikasi transportasi modern dengan dominasi warna biru tua, latar belakang terang, kartu informasi sederhana, ikon yang konsisten, aksen warna untuk status perjalanan, serta ilustrasi kendaraan dan orang yang hidup di halaman autentikasi.

## 2.3 Daftar Halaman

| ID | Halaman | Kebutuhan |
|---|---|---|
| UI-01 | Landing Page | Informasi produk, fitur, alur layanan, dan tombol login/daftar |
| UI-02 | Registrasi | Memilih peran customer/driver dan mengisi data akun |
| UI-03 | Login | Autentikasi pengguna dan tautan akun demo |
| UI-04 | Ganti Sandi Sementara | Memaksa pengguna dengan `must_change_password` mengganti sandi |
| UI-05 | Dashboard Customer | Ringkasan perjalanan aktif dan akses cepat membuat pesanan |
| UI-06 | Buat Pesanan | Lokasi jemput, tujuan, jadwal, peta, estimasi rute, dan tarif |
| UI-07 | Detail Perjalanan | Status perjalanan, peta, driver, rute, dan aksi pembatalan |
| UI-08 | Pembayaran | Pencatatan pembayaran tunai dan status pembayaran |
| UI-09 | Riwayat Pesanan | Daftar perjalanan terdahulu, rating, dan detail |
| UI-10 | Dashboard Driver | Status online/offline, pesanan tersedia, dan pesanan aktif |
| UI-11 | Detail Pesanan Driver | Informasi penjemputan, rute, transisi status, dan konfirmasi tunai |
| UI-12 | Riwayat Driver | Daftar perjalanan selesai dan ringkasan pendapatan |
| UI-13 | Dashboard Admin | Statistik, verifikasi driver, dan pengelolaan pengguna/pesanan |
| UI-14 | Notifikasi | Daftar notifikasi persisten dan penanda sudah dibaca |
| UI-15 | Profil | Informasi akun, kendaraan driver, dan perubahan data |
| UI-16 | Halaman Tidak Ditemukan | Fallback navigasi untuk rute yang tidak tersedia |

## 2.4 Alur Navigasi Customer

1. Membuka landing page dan memilih daftar atau login.
2. Mendaftar sebagai customer, lalu login dengan akun yang dibuat.
3. Jika akun memakai sandi sementara, mengganti sandi terlebih dahulu.
4. Masuk ke dashboard customer.
5. Membuat pesanan dengan mencari alamat jemput dan tujuan.
6. Memilih perjalanan langsung atau terjadwal, lalu memeriksa estimasi rute dan tarif.
7. Mengonfirmasi pesanan dan menunggu driver menerima pesanan.
8. Memantau status perjalanan serta posisi driver secara realtime.
9. Membatalkan pesanan selama status masih `pending`, `accepted`, atau `arrived`.
10. Setelah perjalanan `completed`, mencatat pembayaran tunai.
11. Memberi rating dan komentar kepada driver.
12. Melihat riwayat perjalanan dan notifikasi.

## 2.5 Alur Navigasi Driver

1. Membuka halaman registrasi dan memilih peran driver.
2. Mengisi data akun serta informasi kendaraan (jenis dan plat nomor).
3. Menunggu verifikasi admin; driver `pending` atau `rejected` belum dapat mengambil pesanan.
4. Login setelah akun terverifikasi, lalu mengganti sandi sementara bila diminta.
5. Mengaktifkan status online.
6. Melihat pesanan tersedia, lalu menerima atau menolak pesanan.
7. Memperbarui status perjalanan: `accepted` → `arrived` → `in_progress` → `completed`.
8. Mengonfirmasi pembayaran tunai setelah perjalanan selesai.
9. Melihat riwayat perjalanan dan rating yang diterima.

## 2.6 Alur Navigasi Admin

1. Login dengan akun admin.
2. Melihat statistik pengguna, driver, pesanan, dan pembayaran.
3. Memverifikasi driver (`approved` atau `rejected`).
4. Melihat daftar pengguna dan pesanan, serta melakukan reset data akun bila diperlukan.
5. Memberikan sandi sementara, menghapus akun, atau mereset data demo.
6. Memantau pembayaran tunai dan mengonfirmasi pembayaran bila diperlukan.

## 2.7 Kriteria Keberhasilan Tahap 1

- Seluruh halaman utama sudah memiliki rancangan.
- Navigasi antarahalaman dapat digunakan.
- Formulir registrasi membedakan customer dan driver.
- Dashboard setiap peran memiliki kebutuhan informasi yang sesuai.
- Tampilan responsif pada desktop dan perangkat seluler.
- Komponen tombol, formulir, kartu, modal, dan notifikasi konsisten.
- Prototipe dapat didemonstrasikan tanpa harus menyelesaikan integrasi backend.

**Deliverable:** rancangan UI/UX dan frontend awal menggunakan React + Vite.

---

# 3. Tahap 2 — Implementasi Backend dan Database

## 3.1 Tujuan

Membangun logika aplikasi dan penyimpanan data yang mendukung alur pengguna. Seluruh operasi data harus dilakukan melalui backend, bukan hanya perubahan tampilan frontend.

## 3.2 Teknologi

- Node.js 22 dan Express 5 sebagai runtime/framework REST API (ES modules).
- PostgreSQL 17 sebagai database relasional, diakses melalui driver `pg`.
- Migrasi SQL bernomor yang dijalankan otomatis saat backend start.
- Validasi input dengan Zod dan penanganan error terpusat.
- Autentikasi JWT berbasis Bearer token, dengan dukungan cookie `httpOnly` untuk sesi web.
- Hash kata sandi dengan `bcryptjs`.
- Helmet, CORS terkonfigurasi, batas ukuran body, dan rate limiting pada endpoint sensitif.
- Socket.IO untuk event realtime: status pesanan, notifikasi, dan lokasi driver.
- React 19, Vite 8, React Router 7, Leaflet/react-leaflet, dan Socket.IO client di frontend.
- Layanan eksternal: OSRM untuk rute, serta Mapbox/Google Places/Photon/Nominatim untuk geocoding.

## 3.3 Entitas Database

Implementasi final memakai sembilan tabel: `users`, `driver_profiles`, `bookings`,
`payments`, `locations`, `schema_migrations`, `booking_declines`, `notifications`, dan
`driver_locations`. Skema aktual merupakan superset dari rancangan awal: alamat bebas
dan geometri rute ditambahkan pada Tahap 4, notifikasi dan penolakan pesanan pada Tahap 5,
rating serta lokasi driver pada Tahap 6, lalu pembayaran dinormalisasi menjadi tunai pada
migrasi `011_cash_only_payments.sql`.

### A. Users

| Kolom | Fungsi |
|---|---|
| id | Identitas pengguna |
| name | Nama lengkap |
| email | Email unik |
| password_hash | Kata sandi yang telah di-hash |
| phone | Nomor telepon |
| role | customer, driver, atau admin |
| must_change_password | Penanda pengguna wajib mengganti sandi sementara |
| created_at | Waktu pembuatan akun |

### B. Driver Profiles

| Kolom | Fungsi |
|---|---|
| id | Identitas profil driver |
| user_id | Relasi unik ke users; satu profil per driver |
| vehicle_type | Jenis kendaraan: motor atau mobil |
| vehicle_plate | Nomor kendaraan (nama kolom aktual; menggantikan istilah `vehicle_number` pada rancangan awal) |
| verification_status | pending, approved, atau rejected |
| availability_status | offline atau online |
| rating | Rating driver dengan rentang 0–5 |
| total_trips | Jumlah perjalanan yang telah diselesaikan |
| verified_at | Waktu verifikasi oleh admin |
| created_at | Waktu pembuatan profil |
| updated_at | Waktu pembaruan terakhir |

### C. Bookings

| Kolom | Fungsi |
|---|---|
| id | Identitas pesanan |
| code | Kode unik pesanan, contoh `AJT-1049` |
| customer_id | Relasi ke users; pemesan |
| driver_id | Relasi ke users; driver yang ditugaskan, dapat kosong |
| vehicle_type | Jenis kendaraan yang dipesan |
| pickup_location_id | Relasi lama ke locations; opsional untuk data lama |
| destination_location_id | Relasi lama ke locations; opsional untuk data lama |
| pickup_address | Alamat penjemputan bebas dari pencarian atau peta |
| pickup_latitude | Lintang titik penjemputan |
| pickup_longitude | Bujur titik penjemputan |
| destination_address | Alamat tujuan bebas dari pencarian atau peta |
| destination_latitude | Lintang titik tujuan |
| destination_longitude | Bujur titik tujuan |
| distance_km | Jarak rute dalam kilometer |
| route_duration_minutes | Estimasi durasi rute dalam menit |
| route_geometry | Geometri rute sebagai array JSONB `[lat, lng]` |
| route_provider | Sumber rute: `osrm` atau `haversine` |
| scheduled_at | Jadwal perjalanan |
| estimated_fare | Estimasi tarif dalam rupiah penuh |
| status | pending, accepted, arrived, in_progress, completed, atau cancelled |
| notes | Catatan tambahan untuk driver |
| payment_method | `cash` (kolom lama dipertahankan; hanya menerima `cash` atau `NULL`) |
| payment_status | unpaid, pending, paid, failed, atau expired (status lama dinormalisasi ke pending) |
| paid_at | Waktu pembayaran dikonfirmasi |
| rating | Rating customer untuk driver, 1–5, dapat kosong |
| rating_comment | Komentar rating, dapat kosong |
| rated_at | Waktu rating diberikan |
| created_at | Waktu pembuatan pesanan |
| updated_at | Waktu pembaruan terakhir |

Catatan: `pickup_location_id` dan `destination_location_id` dipertahankan untuk data
lama dan menjadi opsional sejak migrasi `002_freeform_booking_locations.sql`. Booking
baru menyimpan alamat serta koordinat langsung. Kolom rute ditambahkan melalui migrasi
`003_road_routing.sql` agar halaman detail tidak perlu memanggil ulang layanan routing.
Kolom rating ditambahkan melalui `007_booking_ratings.sql`; status pembayaran pada booking
mengikuti tabel `payments`, dan metode pembayaran dikunci ke tunai oleh migrasi `011`.

### D. Payments

| Kolom | Fungsi |
|---|---|
| id | Identitas transaksi |
| booking_id | Relasi unik ke bookings; satu pembayaran per pesanan |
| method | `cash`; constraint hanya menerima tunai |
| amount | Nominal pembayaran dalam rupiah penuh |
| provider_ref | Referensi penyedia lama; tidak dipakai lagi |
| status | pending, paid (failed/expired dipertahankan untuk kompatibilitas data lama) |
| expires_at | Kolom lama QRIS; tidak dipakai lagi |
| qr_payload | Kolom lama QRIS; tidak dipakai lagi |
| confirmation_source | Sumber konfirmasi pembayaran, misalnya `driver` |
| confirmed_by_user_id | Pengguna yang mengonfirmasi pembayaran |
| created_at | Waktu pembuatan transaksi |
| updated_at | Waktu pembaruan terakhir |
| paid_at | Waktu pembayaran terkonfirmasi |

Kolom `expires_at` dan `qr_payload` berasal dari alur QRIS simulasi
(`004_realtime_payments.sql`) dan kini hanya dipertahankan sebagai warisan skema.
Migrasi `010_payment_proof.sql` menambahkan kolom konfirmasi, lalu `011` menghapus
penggunaan QRIS dan memastikan seluruh pembayaran memakai tunai.

### E. Locations (data lama)

| Kolom | Fungsi |
|---|---|
| id | Identitas lokasi preset |
| name | Nama lokasi |
| area | Area atau wilayah |
| latitude | Lintang lokasi |
| longitude | Bujur lokasi |

Tabel ini dipertahankan untuk kompatibilitas data demo dan booking lama. Booking baru
tidak lagi mewajibkan pemilihan lokasi dari tabel ini.

### F. Schema Migrations

| Kolom | Fungsi |
|---|---|
| name | Nama berkas migrasi yang sudah diterapkan (primary key) |
| applied_at | Waktu migrasi diterapkan |

### G. Booking Declines

| Kolom | Fungsi |
|---|---|
| booking_id | Relasi ke bookings |
| driver_id | Relasi ke users; driver yang menolak |
| created_at | Waktu penolakan |

Primary key gabungan `(booking_id, driver_id)` memastikan satu driver hanya dapat menolak
satu pesanan satu kali, sehingga pesanan tidak ditawarkan ulang kepada driver yang sama.

### H. Notifications

| Kolom | Fungsi |
|---|---|
| id | Identitas notifikasi |
| user_id | Penerima notifikasi |
| booking_id | Pesanan terkait, dapat kosong |
| type | Jenis notifikasi, misalnya `booking_created` atau `payment_paid` |
| title | Judul notifikasi |
| message | Isi notifikasi |
| read_at | Waktu dibaca; kosong jika belum dibaca |
| created_at | Waktu notifikasi dibuat |

### I. Driver Locations

| Kolom | Fungsi |
|---|---|
| booking_id | Relasi unik ke bookings; satu posisi terbaru per pesanan |
| driver_id | Driver yang mengirim posisi |
| latitude | Lintang posisi driver |
| longitude | Bujur posisi driver |
| updated_at | Waktu posisi terakhir diperbarui |

Catatan integritas:

- Relasi memakai foreign key: `driver_profiles.user_id` ke `users`, `bookings.customer_id`
  dan `bookings.driver_id` ke `users`, `bookings.*_location_id` ke `locations`,
  `payments.booking_id` ke `bookings`, `booking_declines` ke `bookings` dan `users`,
  `notifications.user_id` ke `users` serta `notifications.booking_id` ke `bookings`,
  dan `driver_locations` ke `bookings` serta `users`.
- `users.email` unik; `driver_profiles.user_id` unik; `bookings.code` unik;
  `payments.booking_id` unik; `driver_locations.booking_id` unik; dan
  `booking_declines` memakai primary key gabungan `(booking_id, driver_id)`.
- `role`, `vehicle_type`, status perjalanan, status pembayaran, rating, metode pembayaran
  tunai, serta koordinat dibatasi dengan `CHECK` constraint.
- Nominal uang disimpan sebagai `INTEGER` rupiah penuh, bukan floating-point. Jarak dan
  koordinat memakai `NUMERIC`.
- Data pembayaran dipisahkan dari status pembayaran pada booking agar riwayat transaksi
  dapat ditelusuri. Kolom `confirmation_source` dan `confirmed_by_user_id` mencatat pihak
  yang mengonfirmasi pembayaran tunai.

## 3.4 REST API

| Method | Endpoint | Akses | Fungsi |
|---|---|---|---|
| GET | `/api/health` | Publik | Healthcheck backend dan koneksi database |
| POST | `/api/auth/register` | Publik | Membuat akun customer atau driver |
| POST | `/api/auth/login` | Publik | Login dan menerbitkan token |
| POST | `/api/auth/logout` | Publik | Logout dan menghapus cookie sesi |
| GET | `/api/auth/me` | Terautentikasi | Mendapatkan sesi pengguna aktif |
| GET | `/api/users/me` | Terautentikasi | Mendapatkan profil sendiri |
| PATCH | `/api/users/me` | Terautentikasi | Memperbarui nama dan nomor telepon |
| PATCH | `/api/users/me/password` | Terautentikasi | Mengganti kata sandi |
| GET | `/api/users` | Admin | Daftar pengguna dengan filter peran dan pagination |
| GET | `/api/locations` | Publik | Daftar lokasi preset lama |
| GET | `/api/drivers` | Admin | Daftar driver |
| PATCH | `/api/drivers/me/availability` | Driver | Mengubah status online/offline |
| PATCH | `/api/drivers/:userId/verification` | Admin | Verifikasi driver (`approved`/`rejected`) |
| GET | `/api/bookings` | Terautentikasi | Daftar pesanan sesuai peran dan pagination |
| POST | `/api/bookings` | Customer | Membuat pesanan, menghitung rute, dan tarif |
| GET | `/api/bookings/:code` | Terautentikasi | Detail pesanan yang boleh diakses |
| PUT | `/api/bookings/:code` | Customer | Mengubah pesanan `pending` milik sendiri |
| GET | `/api/bookings/:code/location` | Terautentikasi | Lokasi driver terbaru untuk pesanan |
| POST | `/api/bookings/:code/accept` | Driver | Menerima pesanan tersedia |
| POST | `/api/bookings/:code/decline` | Driver | Menolak pesanan agar tidak ditawarkan lagi |
| PATCH | `/api/bookings/:code/status` | Driver | Transisi `arrived` → `in_progress` → `completed` |
| POST | `/api/bookings/:code/rating` | Customer | Memberi rating 1–5 setelah perjalanan selesai |
| POST | `/api/bookings/:code/cancel` | Customer/Admin | Membatalkan pesanan yang masih dapat dibatalkan |
| DELETE | `/api/bookings/:code` | Customer/Admin | Menghapus permanen pesanan `cancelled` |
| GET | `/api/bookings/:code/payment` | Terautentikasi | Detail pembayaran pesanan |
| POST | `/api/bookings/:code/payment` | Customer/Driver/Admin | Mencatat pembayaran tunai setelah `completed` |
| POST | `/api/bookings/:code/payment/confirm` | Driver/Admin | Mengonfirmasi pembayaran tunai menjadi `paid` |
| GET | `/api/payments/:id` | Terautentikasi | Detail pembayaran yang boleh diakses |
| GET | `/api/notifications` | Terautentikasi | Daftar notifikasi milik pengguna |
| PATCH | `/api/notifications/read-all` | Terautentikasi | Menandai semua notifikasi sudah dibaca |
| PATCH | `/api/notifications/:id/read` | Terautentikasi | Menandai satu notifikasi sudah dibaca |
| POST | `/api/routes/estimate` | Terautentikasi | Estimasi rute OSRM dengan fallback haversine |
| GET | `/api/geocode/status` | Terautentikasi | Status provider geocoding yang aktif |
| GET | `/api/geocode/search` | Terautentikasi | Pencarian alamat multi-provider |
| GET | `/api/geocode/places/:placeId` | Terautentikasi | Detail tempat Google Places |
| GET | `/api/geocode/reverse` | Terautentikasi | Reverse geocoding koordinat |
| POST | `/api/admin/users/:userId/reset-password` | Admin | Memberikan sandi sementara |
| POST | `/api/admin/users/:userId/reset` | Admin | Mereset data akun |
| DELETE | `/api/admin/users/:userId` | Admin | Menghapus akun |
| POST | `/api/admin/reset-demo` | Admin | Mereset seluruh data demo |

Terdapat 40 endpoint (39 endpoint bisnis + `/api/health`). Endpoint `/api/health`,
register, login, logout, dan `/api/locations` bersifat publik; endpoint lainnya memerlukan
token Bearer. Endpoint admin memerlukan peran `admin`, sedangkan aksi driver/customer
dibatasi oleh peran dan kepemilikan data.

## 3.5 Standar Respons API

Contoh respons ketika pesanan berhasil dibuat:

```json
{
  "success": true,
  "message": "Pesanan AJT-1045 berhasil dibuat dan menunggu driver.",
  "data": {
    "booking": {
      "id": "AJT-1045",
      "code": "AJT-1045",
      "db_id": "10",
      "customer_id": "1",
      "driver_id": null,
      "vehicle_type": "motor",
      "pickup_location_id": null,
      "destination_location_id": null,
      "pickup_location": "Kampus ITB, Ganesha",
      "destination": "Stasiun Bandung",
      "pickup_coords": { "lat": -6.8915, "lng": 107.6107 },
      "destination_coords": { "lat": -6.9147, "lng": 107.6022 },
      "distance_km": 4.5,
      "route_duration_minutes": 8,
      "route_geometry": [[-6.8915, 107.6107], [-6.9147, 107.6022]],
      "route_provider": "osrm",
      "scheduled_at": "2026-11-10T09:00:00.000Z",
      "estimated_fare": 19700,
      "status": "pending",
      "notes": "",
      "rating": null,
      "rating_comment": null,
      "rated_at": null,
      "driver_location": null,
      "payment_method": null,
      "payment_status": "unpaid",
      "paid_at": null,
      "created_at": "2026-11-10T08:00:00.000Z",
      "customer": {
        "id": "1",
        "name": "Roby Syawal",
        "email": "customer@demo.app",
        "phone": "081234567890",
        "role": "customer"
      },
      "driver": null,
      "payment": null
    }
  }
}
```

Semua respons memakai envelope `success`, `message`, dan `data`. Endpoint daftar
menambahkan objek `pagination`; error memakai status HTTP yang sesuai dan objek `error`
berisi kode serta detail validasi. Contoh di atas meringkas objek `customer`; respons
aktual berasal dari aplikasi yang berjalan dan data yang tersimpan di database.

## 3.6 Kriteria Keberhasilan Tahap 2

- Registrasi dan login dapat diuji.
- Role tersimpan pada database.
- CRUD pesanan berfungsi, termasuk pembatalan dan penghapusan terkontrol.
- Validasi data berjalan di backend.
- Pengguna hanya dapat mengakses data sesuai kewenangannya.
- Alur driver, verifikasi admin, dan pengelolaan akun berfungsi.
- Pembayaran tunai dapat dicatat dan dikonfirmasi.
- Notifikasi, rating, dan event realtime tersimpan serta terkirim dengan benar.
- API mengembalikan status HTTP dan JSON yang sesuai.
- Data tetap tersedia setelah aplikasi dijalankan ulang.

---

# 4. Tahap 3 — Deployment Hybrid VM dan Docker

## 4.1 Tujuan

Menjalankan seluruh aplikasi pada VM Kali Linux menggunakan Docker Compose, serta mendokumentasikan pemetaan komponen implementasi ke konsep cloud computing.

## 4.2 Arsitektur

- Windows: perangkat pengembangan, browser, dan Postman.
- VS Code Remote SSH: akses kode dan terminal VM.
- Kali Linux VM: host layanan aplikasi (IaaS lokal).
- Docker Engine dan Docker Compose: containerization dan orkestrasi.
- Proyek Compose `anter-jemput-teman` dengan empat service: `db`, `adminer`, `backend`, dan `frontend`.
- `db`: PostgreSQL 17 Alpine, port internal `5432`, volume `pgdata`, dan healthcheck `pg_isready`.
- `backend`: Node.js 22 Alpine, port internal `4000`, berjalan sebagai user `node`, healthcheck `/api/health`, serta menjalankan migrasi dan seed saat start.
- `frontend`: hasil build Vite yang disajikan nginx pada port internal `80`, dipublikasikan ke host `8080`, dan mem-proxy `/api/` serta `/api/socket.io/` ke backend.
- `adminer`: antarmuka database pada port host `8081`, terhubung ke service `db`.
- Jaringan bridge `ajt` untuk komunikasi internal; database tidak dipublikasikan ke host.
- Konfigurasi rahasia melalui `.env`; seluruh service memakai `restart: unless-stopped`.

## 4.3 Persyaratan Teknis

- Aplikasi dapat dijalankan dengan `docker compose up -d --build`.
- Port frontend (`8080`), backend (`4000`), dan Adminer (`8081`) dikonfigurasi melalui environment.
- Frontend mengakses API melalui reverse proxy nginx pada origin yang sama.
- Backend terhubung ke PostgreSQL melalui nama service `db` di jaringan internal Docker.
- Data PostgreSQL disimpan pada volume persisten `pgdata`.
- Migrasi SQL dijalankan otomatis dan seed demo dapat diaktifkan melalui `SEED_DEMO`.
- Konfigurasi rahasia disimpan melalui environment variables, bukan di image.
- Healthcheck dan `depends_on` memastikan backend menunggu database siap.
- Akses dari Windows diuji melalui alamat IP VM atau port forwarding VirtualBox.

## 4.4 Kriteria Keberhasilan Tahap 3

- Empat container berjalan; database dan backend berstatus sehat.
- Aplikasi dapat dibuka dari browser Windows.
- Endpoint API dan dokumentasi endpoint di README dapat diakses.
- CRUD, autentikasi, dan WebSocket berjalan setelah deployment.
- Data database tidak hilang ketika container dihentikan dan dijalankan kembali.
- Adminer dapat digunakan untuk memeriksa data.
- Dokumentasi CLI, konfigurasi jaringan, dan rebuild tersedia.

## 4.5 Penerapan Konsep Cloud Computing

| Konsep Cloud | Penerapan pada Proyek |
|---|---|
| Infrastructure as a Service (IaaS) | Kali Linux Virtual Machine menyediakan compute, storage, dan jaringan dasar |
| Virtualisasi | Hypervisor menjalankan VM; Docker memisahkan aplikasi ke container |
| Containerization | Image `node:22-alpine`, `nginx:alpine`, `postgres:17-alpine`, dan `adminer` |
| Orchestration | Docker Compose mengatur lifecycle, dependency, network, dan volume |
| Service discovery | Backend menghubungi database melalui hostname `db`; nginx mem-proxy ke `backend:4000` |
| Network isolation | Jaringan bridge `ajt`; hanya port yang dipilih yang dipublikasikan |
| Persistent storage | Named volume `pgdata` untuk data PostgreSQL |
| Reverse proxy / ingress | nginx menyajikan SPA dan meneruskan `/api/` serta WebSocket |
| Configuration as code | `docker-compose.yml`, Dockerfile, `nginx.conf`, dan `.env` |
| Observability | Healthcheck database/backend, status container, dan endpoint `/api/health` |
| High availability | `restart: unless-stopped`; belum ada replikasi atau load balancer |
| Elasticity | Scaling manual dengan Compose; belum ada auto-scaling |
| Software as a Service (SaaS) | Mapbox Geocoding, Google Places/Geocoding, OSRM, OpenStreetMap, Photon, Nominatim |
| Platform as a Service (PaaS) | Image resmi PostgreSQL, nginx, Node.js, dan Adminer sebagai basis runtime |
| Security | User non-root backend, Helmet, CORS, JWT, validasi Zod, dan secret melalui `.env` |

Implementasi ini merupakan cloud computing skala lokal, bukan layanan cloud publik. VM
tunggal, tidak ada auto-scaling, load balancer, multi-region, TLS produksi, monitoring
terpusat, atau backup otomatis. Socket.IO masih memakai adapter in-memory sehingga belum
siap untuk horizontal scaling tanpa adapter eksternal seperti Redis.

---

# 5. Tahap 4 — Fitur Transportasi

## 5.1 Pemesanan

Customer membuat pesanan dengan memilih titik jemput dan tujuan melalui pencarian alamat
atau peta, memilih jenis kendaraan, menentukan jadwal, dan menambahkan catatan. Backend
menghitung rute serta tarif, lalu menyimpan pesanan dengan kode `AJT-xxxx` dan status awal
`pending`.

Tarif dihitung di server: motor `8.000 + 2.600 × km`, mobil `12.000 + 4.200 × km`, lalu
dibulatkan ke atas kelipatan `500`. Jarak memakai rute OSRM bila tersedia; jika tidak,
dipakai haversine dan `route_provider` bernilai `haversine`.

Pesanan `pending` masih dapat diubah customer. Customer atau admin dapat membatalkan
pesanan selama status `pending`, `accepted`, atau `arrived`; pesanan `cancelled` dapat
dihapus permanen oleh customer pemilik atau admin. Setiap pembuatan, perubahan, dan
pembatalan pesanan mengirim event realtime serta notifikasi persisten.

## 5.2 Pengelolaan Pesanan Driver

Driver harus berstatus `approved` dan `online` untuk mengambil pesanan yang sesuai jenis
kendaraannya. Daftar pesanan tersedia difilter berdasarkan jenis kendaraan; driver
`pending` atau `rejected` tidak dapat menerima pesanan. Proses menerima pesanan memakai
pembaruan bersyarat di backend (`status = 'pending' AND driver_id IS NULL`) sehingga dua
driver tidak dapat mengambil pesanan yang sama.

Driver dapat menolak pesanan; penolakan dicatat pada `booking_declines` agar pesanan tidak
ditawarkan lagi kepada driver tersebut. Setelah menerima, driver menjalankan transisi:

`accepted` → `arrived` → `in_progress` → `completed`

Customer tidak dapat mengubah status perjalanan. Setelah `completed`, customer mencatat
pembayaran tunai, driver atau admin mengonfirmasi pembayaran, dan customer dapat memberi
rating 1–5. Rating serta jumlah perjalanan driver diperbarui secara agregat.

## 5.3 Peta dan Lokasi

Leaflet digunakan untuk menampilkan peta dengan data peta dari OpenStreetMap atau penyedia lain yang sesuai ketentuan penggunaannya.

Fitur peta dan pencarian alamat:
- Memilih titik penjemputan dan tujuan dengan pencarian alamat setelah 2 karakter.
- Mencari nama jalan, dusun, desa/kelurahan, kecamatan, dan tempat dengan urutan provider Mapbox, Google Places, lalu Photon + Nominatim. Mapbox memakai Geocoding API v6; Google memakai Autocomplete (New), Place Details, dan Geocoding.
- Pencarian dan reverse geocoding diproksikan melalui backend agar token Mapbox/API key Google tidak terekspos ke browser dan fallback tetap tersedia saat provider gagal atau belum dikonfigurasi.
- Menampilkan marker lokasi yang dapat diklik dan digeser untuk memperbaiki titik.
- Mengisi alamat titik peta melalui reverse geocoding dan menyediakan tombol lokasi GPS perangkat.
- Menampilkan pilihan tampilan Peta dan Satelit, zoom, skala, serta estimasi jarak atau rute jika layanan routing tersedia.

Mapbox dan Google bersifat opsional dan membutuhkan token/key yang valid; tanpa keduanya,
aplikasi tetap memakai Photon + Nominatim. Pencarian Nominatim dibatasi ke Indonesia,
memakai cache, dan diberi jeda minimal 1,1 detik antarpermintaan. Tracking GPS driver sudah
diimplementasikan: frontend mengirim posisi berkala saat perjalanan aktif, backend
menyimpannya ke `driver_locations` dan menyiarkannya melalui Socket.IO hanya kepada
customer pemilik pesanan dan admin. Estimasi tarif dan jarak memakai perhitungan yang
dijelaskan di atas, bukan angka yang diklaim sebagai data aktual tanpa dasar.

## 5.4 Kriteria Keberhasilan Tahap 4

- Customer dapat membuat pesanan dengan rute dan tarif yang dihitung server.
- Driver terverifikasi dapat menerima atau menolak pesanan tanpa benturan antar-driver.
- Status perjalanan berubah sesuai aturan dan hanya oleh pihak berwenang.
- Data lokasi, geometri rute, dan posisi driver tersimpan serta ditampilkan dengan benar.
- Pembatalan dan penghapusan pesanan mengikuti aturan status.
- Riwayat perjalanan dan rating dapat dibaca kembali.

---

# 6. Tahap 5 — Realtime dan Pembayaran

## 6.1 Realtime

Socket.IO digunakan untuk menyampaikan pembaruan status pesanan dan posisi driver kepada pengguna yang berwenang. Koneksi memakai kanal `/api/socket.io`, diautentikasi dengan cookie sesi JWT, lalu dikelompokkan ke room pengguna, room admin, dan room jenis kendaraan.

Sistem memastikan hanya pihak yang terkait dengan perjalanan dapat menerima data lokasi
dan status yang relevan. Pesanan baru hanya dikirim ke driver dengan jenis kendaraan yang
sesuai; posisi driver hanya dikirim ke customer pemilik pesanan dan admin. Event yang
digunakan meliputi `booking:updated`, `booking:available`, `booking:unavailable`,
`booking:deleted`, `notification:new`, `driver:location`, dan `realtime:ready`. Frontend
memperbarui daftar pesanan, detail perjalanan, serta status pembayaran tanpa memuat ulang
halaman. Notifikasi juga disimpan di tabel `notifications` agar tetap tersedia setelah
reload atau login ulang.

## 6.2 Pembayaran

Implementasi saat ini hanya mendukung pembayaran tunai. QRIS, payment gateway, webhook,
simulator penyedia, dan kolom `expires_at`/`qr_payload` tidak lagi digunakan; kolom
tersebut hanya dipertahankan sebagai warisan skema.

Alur pembayaran:

1. Perjalanan harus berstatus `completed`.
2. Customer, driver, atau admin mencatat pembayaran tunai melalui
   `POST /api/bookings/:code/payment`; nominal mengikuti `estimated_fare` dan status
   pembayaran menjadi `pending`.
3. Driver yang ditugaskan atau admin mengonfirmasi melalui
   `POST /api/bookings/:code/payment/confirm`; status menjadi `paid`, `paid_at` diisi, dan
   `confirmation_source` bernilai `driver` atau `admin`.
4. Jika driver/admin mengonfirmasi tanpa pencatatan sebelumnya, sistem membuat pembayaran
   tunai langsung berstatus `paid`.
5. Saat pembayaran dicatat, driver menerima notifikasi `payment_created`; saat
   dikonfirmasi, customer dan driver menerima `payment_paid`. Event realtime memperbarui
   tampilan tanpa reload.

Backend menolak pembayaran untuk pesanan yang belum `completed` atau sudah `cancelled`,
membatasi akses ke customer pemilik, driver yang ditugaskan, dan admin, serta membuat
konfirmasi bersifat idempotent untuk pembayaran yang sudah `paid`. Status lama `failed`
atau `expired` dinormalisasi menjadi `pending` oleh migrasi `011`.

## 6.3 Kriteria Keberhasilan Tahap 5

- Status perjalanan dan notifikasi diperbarui tanpa harus memuat ulang halaman.
- Posisi driver tersimpan dan hanya disiarkan kepada customer pemilik serta admin.
- Transaksi tunai tersimpan dan terkait dengan pesanan.
- Status pembayaran dapat dibedakan antara `pending` dan `paid`.
- Hanya customer pemilik, driver yang ditugaskan, dan admin yang dapat mengakses pembayaran.
- Pembayaran ditolak sebelum perjalanan selesai atau untuk pesanan yang dibatalkan.
- Tidak ada lagi alur QRIS, webhook, atau simulator pembayaran yang aktif.

---

# 7. Tahap 6 — Pengujian dan Dokumentasi

## 7.1 Jenis Pengujian

- Pengujian fungsional UI pada desktop dan viewport seluler.
- Pengujian CRUD, validasi, dan pagination.
- Pengujian autentikasi, otorisasi role, dan kepemilikan data.
- Pengujian REST API menggunakan Node test + Supertest.
- Pengujian REST API menggunakan Postman/Newman.
- Pengujian koneksi database, migrasi, dan seed.
- Pengujian jaringan VM, Docker, nginx, dan WebSocket.
- Pengujian persistensi data setelah container dibuat ulang.
- Pengujian alur pemesanan, pembatalan, penghapusan, dan transisi status.
- Pengujian pembayaran tunai, konfirmasi, dan penolakan metode non-tunai.
- Pengujian realtime, notifikasi persisten, rating, dan pengelolaan akun admin.
- Pengujian geocoding multi-provider, routing OSRM, dan fallback haversine.
- Pengujian keamanan dasar: hash sandi, token, CORS, rate limit, dan validasi input.

## 7.2 Dokumentasi yang Disiapkan

1. `README.md` dan `PRD_ProjectCC.md` untuk deskripsi, arsitektur, dan status proyek.
2. `docs/DEPLOYMENT_DARI_NOL.md` untuk instalasi dan deployment awal.
3. `docs/DEPLOYMENT_REBUILD_DOCKER.md` untuk rebuild dan perbaikan container.
4. `docs/TAHAP6_PENGUJIAN_DAN_DOKUMENTASI.md` untuk laporan pengujian lengkap.
5. `docs/DEMO_POSTMAN.md` untuk panduan demo REST API.
6. `postman/` untuk koleksi dan environment Postman.
7. `docs/screenshots/` untuk screenshot aplikasi.
8. `scripts/` untuk smoke test, screenshot UI, uji hapus UI, dan cek persistensi.
9. `backend/src/db/migrations/` dan `backend/README.md` untuk struktur database serta API.
10. `.env.example`, `docker-compose.yml`, Dockerfile, dan `nginx.conf` untuk konfigurasi.

## 7.3 Kriteria Keberhasilan Akhir

- Aplikasi dapat dijalankan secara lokal melalui Docker Compose.
- UI/UX dapat digunakan untuk alur utama customer, driver, dan admin.
- Customer, driver, dan admin memiliki akses berbeda.
- CRUD database, pembayaran tunai, realtime, notifikasi, dan rating berfungsi.
- REST API dapat diuji secara otomatis dan melalui Postman.
- Deployment VM dan Docker terdokumentasi.
- Fitur tambahan yang telah diimplementasikan dapat diuji dan didemonstrasikan.
- Keterbatasan dan fitur yang belum selesai dijelaskan secara transparan.

## 7.4 Bukti Implementasi Tahap 6

- Laporan lengkap berada di `docs/TAHAP6_PENGUJIAN_DAN_DOKUMENTASI.md`.
- Screenshot aplikasi tersedia di `docs/screenshots/`.
- Koleksi dan environment Postman tersedia di `postman/`.
- Smoke test stack, screenshot UI, uji hapus UI, dan pemeriksaan persistensi tersedia di
  `scripts/`.
- Pengujian API otomatis: 32 pengujian tersedia; bagian 10.2 laporan Tahap 6 mencatat
  32/32 lulus.
- Pengujian Postman/Newman: 65 request, 104 assertion, 0 gagal.
- Smoke test stack: 9 pemeriksaan lulus, termasuk Socket.IO dan migrasi database.
- Pengujian UI headless: 9 halaman/screenshot lulus, termasuk tampilan seluler dan uji
  hapus permanen pesanan `cancelled`.
- Persistensi: jumlah `users`, `bookings`, `payments`, dan migrasi tetap sama setelah
  container Docker dibuat ulang tanpa menghapus volume.

---

# 8. Persyaratan Nonfungsional

## 8.1 Keamanan

- Kata sandi di-hash dengan `bcryptjs` dan tidak pernah disimpan atau dikembalikan sebagai teks biasa.
- Autentikasi memakai JWT; web memakai cookie `httpOnly`, sedangkan API dapat memakai Bearer token.
- Endpoint yang membutuhkan autentikasi dilindungi middleware; hak akses role dan kepemilikan data diperiksa di backend.
- Input divalidasi dengan Zod sebelum disimpan; error validasi tidak membocorkan stack trace pada produksi.
- Helmet, CORS terbatas, body limit, dan rate limiting diterapkan pada API serta endpoint autentikasi.
- Secret API, kredensial database, dan `JWT_SECRET` berada di environment, bukan di frontend atau image.
- Akses lokasi driver dan pembayaran dibatasi kepada customer pemilik, driver yang ditugaskan, dan admin.
- Backend berjalan sebagai user non-root di container.
- Reset data demo dibatasi oleh `ALLOW_DEMO_RESET` dan hanya dapat dilakukan admin.
- Keterbatasan: belum ada HTTPS/TLS produksi, MFA, audit log terpusat, atau manajemen secret eksternal.

## 8.2 Kinerja

Aplikasi ditargetkan tetap dapat dijalankan pada VM dengan sumber daya terbatas. Container dijaga
seminimal mungkin dan frontend disajikan sebagai aset statis melalui nginx.

Optimasi yang sudah diterapkan: index database pada kolom pencarian utama, pagination untuk
daftar pengguna/pesanan/notifikasi, penyimpanan geometri rute agar tidak memanggil ulang OSRM,
cache pencarian geocoding, timeout untuk layanan eksternal, dan reverse proxy agar frontend
dan API memakai origin yang sama. Belum ada pengujian beban formal atau target latency angka;
pengukuran dilakukan setelah implementasi, bukan berdasarkan asumsi.

## 8.3 Keandalan

- Database memakai volume persisten `pgdata`.
- Container memakai `restart: unless-stopped` dan healthcheck.
- Migrasi dijalankan dalam transaksi; kegagalan migrasi di-rollback.
- Error API ditangani dengan respons konsisten dan status HTTP yang sesuai.
- Pembayaran tunai bersifat idempotent dan tidak dapat dikonfirmasi ganda.
- Data pembayaran dipisahkan dari status booking agar riwayat tetap dapat ditelusuri.
- Socket.IO menangani reconnect di frontend; notifikasi tetap tersimpan di database.
- Keterbatasan: belum ada backup otomatis, replikasi database, atau monitoring terpusat.

## 8.4 Kemudahan Penggunaan

- Navigasi mudah dipahami dan konsisten antarhalaman.
- Formulir menampilkan validasi serta pesan kesalahan yang jelas.
- Status pesanan dan pembayaran terlihat jelas melalui label dan warna.
- Tersedia tampilan loading, kosong, berhasil, dan gagal.
- Tampilan dapat digunakan pada layar desktop maupun seluler.
- Akun demo dan tautan login cepat tersedia untuk demonstrasi.
- Notifikasi, riwayat, dan rating membantu pengguna memantau perjalanan.
- Animasi menghormati `prefers-reduced-motion`.

---

# 9. Prioritas Pengembangan

Prioritas implementasi dibagi menjadi tiga tingkat.

### P0 — Wajib (selesai)

- Frontend dasar dan landing page.
- Registrasi, login, logout, dan perubahan sandi.
- Role customer, driver, dan admin.
- CRUD pemesanan, pembatalan, dan penghapusan terkontrol.
- PostgreSQL, migrasi, dan seed demo.
- REST API dengan respons JSON.
- Docker Compose dan akses dari Windows.
- Pengujian dan dokumentasi dasar.

### P1 — Fitur utama transportasi (selesai)

- Dashboard sesuai role.
- Alur verifikasi driver dan penerimaan/penolakan pesanan.
- Peta, pencarian alamat multi-provider, dan pemilihan lokasi.
- Routing OSRM, fallback haversine, dan tarif server.
- Riwayat perjalanan, rating, dan notifikasi.
- Status perjalanan realtime dan posisi driver.
- Pembayaran tunai serta konfirmasi driver/admin.
- Pengelolaan akun dan reset demo oleh admin.

### P2 — Pengembangan lanjutan

- Tracking GPS driver real-time (selesai).
- Notifikasi persisten (selesai).
- Verifikasi driver oleh admin (selesai).
- Penjadwalan perjalanan (selesai).
- QRIS/payment gateway (di luar ruang lingkup saat ini).
- Auto-scaling, load balancer, HTTPS produksi, backup otomatis, dan monitoring terpusat
  (belum diimplementasikan).

Pembagian ini membantu memastikan persyaratan inti tugas selesai, sementara fitur yang
belum diimplementasikan dicatat sebagai roadmap dan bukan diklaim sebagai fitur aktif.

---

# 10. Asumsi dan Keputusan yang Perlu Dikonfirmasi

PRD ini menggunakan asumsi dan keputusan implementasi berikut:

1. Aplikasi merupakan web app, bukan aplikasi native.
2. Customer dan driver dapat membuat akun melalui halaman registrasi.
3. Driver harus diverifikasi admin sebelum dapat online dan mengambil pesanan.
4. Admin mengelola verifikasi, pengguna, pembayaran, dan reset data demo.
5. PostgreSQL digunakan sebagai database utama.
6. Frontend, backend, dan database dijalankan melalui Docker Compose di dalam Kali Linux VM.
7. Aplikasi diuji dari Windows melalui jaringan VM atau port forwarding.
8. Pembayaran dibatasi ke tunai; QRIS dan payment gateway berada di luar ruang lingkup.
9. Mapbox dan Google Places bersifat opsional; tanpa keduanya dipakai Photon + Nominatim.
10. Routing memakai OSRM publik; jika gagal dipakai haversine.
11. Tarif dihitung server dengan formula tetap, bukan tarif dinamis.
12. Data demo dan kredensial demo hanya untuk demonstrasi, bukan produksi.
13. Socket.IO memakai adapter in-memory dan diasumsikan berjalan pada satu instance backend.

Keputusan terkait microservices, penyedia pembayaran nontunai, layanan routing berbayar,
kebijakan tarif dinamis, dan infrastruktur produksi dapat ditinjau jika kebutuhan berubah.

---

# 11. Status Implementasi dan Roadmap

Implementasi Tahap 1–6 telah selesai. Ringkasan status:

| Area | Status | Bukti |
|---|---|---|
| UI/UX dan navigasi per peran | Selesai | Halaman customer, driver, admin, notifikasi, profil |
| Autentikasi dan otorisasi | Selesai | JWT, bcrypt, middleware role, tes API |
| Database dan migrasi | Selesai | 9 tabel, migrasi `001`–`011`, seed demo |
| REST API | Selesai | 40 endpoint, dokumentasi di README |
| Pemesanan dan status perjalanan | Selesai | Create, update, cancel, delete, accept, decline, transisi status |
| Peta, geocoding, dan routing | Selesai | Leaflet, Mapbox/Google/Photon/Nominatim, OSRM + haversine |
| Pembayaran tunai | Selesai | Pencatatan dan konfirmasi driver/admin |
| Realtime dan notifikasi | Selesai | Socket.IO, `driver_locations`, `notifications` |
| Rating dan pengelolaan admin | Selesai | Rating agregat, verifikasi driver, reset akun/demo |
| Deployment Docker | Selesai | 4 service, nginx, healthcheck, volume `pgdata` |
| Pengujian | Selesai | 32 tes API, Postman 65/104, smoke 9, UI headless |
| Dokumentasi | Selesai | README, PRD, deployment, Tahap 6, Demo Postman |

## Roadmap dan Perbaikan Lanjutan

- Menjalankan ulang tes API dan Newman sebelum presentasi untuk memastikan hasil terbaru.
- Memperbarui dokumentasi atau screenshot lama yang masih menyebut QRIS.
- Membersihkan kunci `.env` yang tidak lagi dipakai dan melengkapi `.env.example` dengan
  `MAPBOX_ACCESS_TOKEN` serta `GOOGLE_MAPS_API_KEY`.
- Menambahkan HTTPS/TLS, manajemen secret eksternal, dan pembatasan akses produksi.
- Menambahkan backup otomatis, monitoring terpusat, serta rotasi log Docker.
- Menambahkan load balancer dan adapter Socket.IO eksternal (misalnya Redis) sebelum
  melakukan horizontal scaling.
- Mempertimbangkan QRIS/payment gateway sebagai fitur baru dengan persyaratan merchant,
  webhook, dan audit transaksi tersendiri.
- Menginisialisasi repository Git dan pipeline CI untuk lint, build, dan tes otomatis.

**Prinsip utama pengembangan:** setiap tahap harus menghasilkan sesuatu yang bisa dilihat,
dijalankan, atau diuji. Fitur yang belum tersedia dicatat sebagai roadmap, bukan diklaim
sebagai bagian dari implementasi saat ini.
