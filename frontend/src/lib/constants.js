export const ROLES = {
  CUSTOMER: 'customer',
  DRIVER: 'driver',
  ADMIN: 'admin',
}

export const ROLE_LABEL = {
  customer: 'Customer',
  driver: 'Driver',
  admin: 'Admin',
}

export const HOME_PATH = {
  customer: '/app',
  driver: '/driver',
  admin: '/admin',
}

export const BOOKING_STATUS = {
  pending: {
    label: 'Menunggu driver',
    tone: 'pending',
    description: 'Pesanan dikirim ke driver terdekat.',
  },
  accepted: {
    label: 'Driver ditugaskan',
    tone: 'accepted',
    description: 'Driver sedang menuju lokasi penjemputan.',
  },
  arrived: {
    label: 'Driver tiba',
    tone: 'arrived',
    description: 'Driver sudah berada di titik penjemputan.',
  },
  in_progress: {
    label: 'Dalam perjalanan',
    tone: 'in_progress',
    description: 'Perjalanan sedang berlangsung menuju tujuan.',
  },
  completed: {
    label: 'Selesai',
    tone: 'completed',
    description: 'Perjalanan selesai.',
  },
  cancelled: {
    label: 'Dibatalkan',
    tone: 'cancelled',
    description: 'Pesanan dibatalkan.',
  },
}

export const STATUS_FLOW = ['pending', 'accepted', 'arrived', 'in_progress', 'completed']

export const ACTIVE_STATUSES = ['pending', 'accepted', 'arrived', 'in_progress']

export const PAYMENT_STATUS = {
  unpaid: { label: 'Belum dibayar', tone: 'pending' },
  pending: { label: 'Menunggu pembayaran', tone: 'pending' },
  paid: { label: 'Lunas', tone: 'completed' },
  failed: { label: 'Gagal', tone: 'cancelled' },
  expired: { label: 'Kedaluwarsa', tone: 'cancelled' },
}

export const PAYMENT_METHOD = {
  cash: { label: 'Tunai', description: 'Bayar langsung kepada driver.' },
}

export const VEHICLES = [
  { id: 'motor', label: 'Motor', description: '1 penumpang · cepat dan hemat' },
  { id: 'mobil', label: 'Mobil', description: 'Hingga 4 penumpang' },
]

export const VEHICLE_LABEL = {
  motor: 'Motor',
  mobil: 'Mobil',
}

export const DEMO_ACCOUNTS = [
  {
    role: 'customer',
    email: 'customer@demo.app',
    password: 'demo1234',
    name: 'Roby Syawal',
    note: 'Customer',
  },
  {
    role: 'driver',
    email: 'driver@demo.app',
    password: 'demo1234',
    name: 'Budi Santoso',
    note: 'Driver terverifikasi',
  },
  {
    role: 'admin',
    email: 'admin@demo.app',
    password: 'demo1234',
    name: 'Sari Wulandari',
    note: 'Admin',
  },
  {
    role: 'driver',
    email: 'agus@demo.app',
    password: 'demo1234',
    name: 'Agus Salim',
    note: 'Driver menunggu verifikasi',
  },
]

export const DRIVER_VERIFICATION = {
  pending: {
    label: 'Menunggu verifikasi',
    tone: 'pending',
    description: 'Pendaftaran driver akan ditinjau admin sebelum bisa masuk.',
  },
  approved: {
    label: 'Terverifikasi',
    tone: 'completed',
    description: 'Akun driver sudah disetujui admin.',
  },
  rejected: {
    label: 'Ditolak',
    tone: 'cancelled',
    description: 'Verifikasi driver ditolak. Hubungi admin untuk tindak lanjut.',
  },
}
