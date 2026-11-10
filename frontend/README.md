# Anter Jemput Teman — Frontend

Antarmuka React untuk aplikasi antar jemput **customer**, **driver**, dan **admin**.
Seluruh data diambil dari REST API Express + PostgreSQL; tidak ada lagi data demo di
`localStorage`. Peta interaktif memakai Leaflet + react-leaflet dengan tile OpenStreetMap
dan tampilan awal seluruh Indonesia.

## Menjalankan

Backend harus berjalan lebih dulu (lihat `../backend/README.md`).

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173/`. Vite mem-proxy `/api` ke `http://localhost:4000`
(dapat diubah lewat variabel `API_PROXY_TARGET`).

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan (Vite, hot reload) |
| `npm run build` | Build produksi ke folder `dist/` |
| `npm run preview` | Menjalankan hasil build secara lokal |
| `npm run lint` | Pemeriksaan kode dengan Oxlint |

## Akun demo

Semua kata sandi: `demo1234`

| Peran | Email | Catatan |
| --- | --- | --- |
| Customer | `customer@demo.app` | Perjalanan aktif dan riwayat |
| Driver | `driver@demo.app` | Terverifikasi, status online |
| Admin | `admin@demo.app` | Menyetujui/menolak driver, reset demo |
| Driver (menunggu) | `agus@demo.app` | Belum bisa login sebelum disetujui admin |
| Driver (ditolak) | `rina@demo.app` | Login ditolak setelah diverifikasi negatif |

Tombol pada daftar akun demo di halaman login langsung memanggil API login.
Admin dapat mengembalikan data demo lewat **Profil → Reset data demo**.

## Halaman

| Kode PRD | Halaman | Rute |
| --- | --- | --- |
| UI-01 | Landing | `/` |
| UI-02 | Registrasi (customer/driver) | `/register` |
| UI-03 | Login | `/login` |
| UI-04 | Dashboard customer | `/app` |
| UI-05 | Buat pesanan | `/app/bookings/new` |
| UI-06 | Detail perjalanan | `/app/bookings/:bookingId` |
| UI-07 | Pembayaran | `/app/bookings/:bookingId/payment` |
| UI-08 | Riwayat pesanan | `/app/history` |
| UI-09 | Dashboard driver | `/driver` |
| UI-10 | Detail pesanan driver | `/driver/orders/:bookingId` |
| UI-11 | Profil (semua peran) | `/app/profile`, `/driver/profile`, `/admin/profile` |
| UI-12 | Dashboard admin | `/admin` |

## Alur yang bisa dicoba

1. **Customer** — login → *Buat Pesanan* → tentukan titik jemput dan tujuan bebas di
   seluruh Indonesia dengan klik peta atau cari alamat, tentukan jadwal dan kendaraan →
   pratinjau rute jalan tampil → pesanan dibuat di server dengan status *Menunggu
   driver*. Tarif final dihitung backend dari jarak rute jalan.
2. **Driver** — login → aktifkan status online → terima pesanan → *Saya sudah tiba* →
   *Mulai perjalanan* → *Selesaikan perjalanan*.
3. **Pembayaran (simulasi)** — customer membuat kode QRIS bertanda tangan atau mencatat
   tunai. Customer tidak dapat menandai QRIS lunas; status berubah setelah webhook
   simulator diverifikasi backend. Admin dapat menekan **Simulasikan QRIS** pada tabel
   pesanan untuk demo. Driver mengonfirmasi tunai yang diterima. Tidak ada uang nyata.
4. **Admin** — verifikasi driver pending, pantau seluruh pengguna/pesanan, dan reset data
   demo. Driver yang disetujui langsung dapat login.
5. **Registrasi** — setelah akun customer dibuat, pengguna diarahkan ke halaman login dan
   harus masuk dengan akun baru. Registrasi driver berstatus `pending`, tidak otomatis
   login, dan muncul di antrean verifikasi admin.
6. **Hapus permanen** — pesanan yang sudah dibatalkan menampilkan tombol **Hapus** di
   riwayat dan detail. Customer hanya dapat menghapus pesanannya sendiri; admin dapat
   menghapus pesanan siapa pun. Data pembayaran terkait ikut terhapus.

## Integrasi API

- `src/lib/api.js` — pembungkus `fetch` dengan `credentials: 'include'`, dukungan
  `AbortSignal`, parsing `{ success, message, data }`, dan `ApiError` berisi `.status`
  serta `.errors` per field.
- `src/lib/geocode.js` — klien `GET /api/geocode/search`, `/places/:placeId`, dan
  `/reverse`. Backend memilih Mapbox, lalu Google Places (bila `GOOGLE_MAPS_API_KEY`
  tersedia), lalu Photon + Nominatim, sehingga token/key tidak masuk ke bundle frontend.
- `src/components/booking/MapView.jsx` — peta OpenStreetMap/Satelit, penanda yang dapat
  digeser, skala, dan auto-zoom ke titik terpilih.
- `POST /api/routes/estimate` dipakai untuk pratinjau jarak, durasi, dan geometri rute
  jalan; hasil akhir tetap dihitung server saat booking dibuat.
- `src/context/AuthContext.jsx` — sesi (`/auth/me`), login, register, logout,
  `updateProfile`, `changePassword`, `refreshUser`.
- `src/context/DataContext.jsx` — pesanan, pengguna (admin), koneksi Socket.IO, lokasi
  driver, serta aksi `createBooking`, `createPayment`, `confirmPayment`,
  `simulateQrisPayment`, `shareDriverLocation`, `acceptBooking`, `updateBookingStatus`,
  `cancelBooking`, `deleteBooking`, `verifyDriver`, `setAvailability`, `resetDemo`.
- Koneksi realtime memakai `/api/socket.io` lewat proxy Vite/Nginx. Event
  `booking:updated`, `booking:available`, `booking:unavailable`, `booking:deleted`, dan
  `driver:location` memperbarui dashboard/detail tanpa reload.
- Data juga dimuat ulang otomatis saat jendela kembali fokus; tombol muat ulang tersedia
  pada halaman yang membutuhkan status terbaru.
- Provider order: `ToastProvider → AuthProvider → DataProvider → App`.

## Batasan

- **Pembayaran hanya simulasi**: QRIS memakai payload simulasi, kedaluwarsa, dan webhook
  bertanda tangan; tunai dikonfirmasi manual oleh driver. Tidak ada payment gateway
  maupun uang sungguhan.
- Peta memakai tile OpenStreetMap/Esri. Pencarian memakai Mapbox lebih dulu, lalu Google
  Places, lalu Photon + Nominatim; reverse geocoding mengikuti urutan yang sama. Rute
  memakai OSRM publik sehingga butuh koneksi internet; belum ada tile proxy, mode offline,
  atau instance mandiri. Bila tile gagal dimuat, penanda tetap tampil di latar kosong.
- Mapbox diaktifkan lewat `MAPBOX_ACCESS_TOKEN` di `.env` root dan memakai Geocoding API
  v6. Token harus valid dengan scope geocoding. Bila token ditolak, backend beralih ke
  Google Places atau Photon/Nominatim tanpa mengubah frontend.
- Google Places dapat diaktifkan lewat `GOOGLE_MAPS_API_KEY` di `.env` root. Backend
  memakai Google Places Autocomplete (New), Place Details, dan Google Geocoding, lalu
  kembali ke Photon/Nominatim bila key kosong atau Google gagal.
- Pencarian default dibatasi ke bbox Indonesia dan hasil dengan kode negara selain `ID`
  dibuang; Google Places dibatasi dengan `includedRegionCodes: ["id"]` dan location bias
  di sekitar titik aktif.
- Kualitas alamat bergantung pada provider yang aktif. Bila token Mapbox tidak valid,
  hasil otomatis berasal dari Google atau OSM. Alamat hasil reverse geocoding bisa kurang
  presisi; pengguna dapat menggeser penanda, memakai lokasi GPS, atau memilih titik
  koordinat langsung.
- Garis peta mengikuti rute jalan dari OSRM untuk booking baru. Bila OSRM gagal/timeout,
  UI menampilkan peringatan dan memakai estimasi garis lurus.
- Estimasi di UI adalah pratinjau; jarak dan tarif final tetap dihitung server.
- Registrasi/login driver tunduk pada verifikasi admin; akun `pending`/`rejected` ditolak
  oleh server.

## Teknologi

- React 19 + Vite 8, React Router 7
- Leaflet 1.9 + react-leaflet 5 (tile OpenStreetMap)
- JavaScript/JSX, CSS murni dengan design token (tanpa library UI)
- Ikon SVG inline; font Inter
- Sesi: cookie httpOnly dari API (tidak ada token di `localStorage`)

## Struktur

```
src/
  components/   # UI dasar, layout, komponen booking
  context/      # AuthContext, DataContext
  lib/          # api client, konstanta, format, perhitungan tarif
  pages/        # halaman per peran: customer, driver, admin, shared
  styles/       # token + components.css, layout.css, pages.css, polish.css
```
