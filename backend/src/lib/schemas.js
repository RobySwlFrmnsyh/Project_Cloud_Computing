import { z } from 'zod'

const email = z
  .string({ error: 'Email wajib diisi.' })
  .trim()
  .toLowerCase()
  .email('Format email belum benar.')
  .max(160, 'Email terlalu panjang.')

const password = z
  .string({ error: 'Kata sandi wajib diisi.' })
  .min(8, 'Kata sandi minimal 8 karakter.')
  .max(72, 'Kata sandi maksimal 72 karakter.')

const phone = z
  .string({ error: 'Nomor telepon wajib diisi.' })
  .trim()
  .regex(/^[0-9+\s-]{9,16}$/, 'Nomor telepon tidak valid (9–16 digit).')

const name = z
  .string({ error: 'Nama lengkap wajib diisi.' })
  .trim()
  .min(3, 'Nama minimal 3 karakter.')
  .max(80, 'Nama maksimal 80 karakter.')

export const registerSchema = z
  .object({
    name,
    email,
    phone,
    password,
    role: z.enum(['customer', 'driver'], {
      error: 'Peran harus customer atau driver.',
    }),
    vehicleType: z.enum(['motor', 'mobil']).optional(),
    plate: z.string().trim().max(16, 'Nomor kendaraan terlalu panjang.').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== 'driver') return

    if (!data.vehicleType) {
      ctx.addIssue({
        code: 'custom',
        path: ['vehicleType'],
        message: 'Jenis kendaraan wajib dipilih.',
      })
    }

    const plate = (data.plate ?? '').trim()
    if (plate.length < 4) {
      ctx.addIssue({
        code: 'custom',
        path: ['plate'],
        message: 'Nomor kendaraan wajib diisi (minimal 4 karakter).',
      })
    }
  })

export const loginSchema = z.object({
  email: z
    .string({ error: 'Email wajib diisi.' })
    .trim()
    .toLowerCase()
    .min(1, 'Email wajib diisi.')
    .email('Format email belum benar.'),
  password: z
    .string({ error: 'Kata sandi wajib diisi.' })
    .min(1, 'Kata sandi wajib diisi.')
    .max(72, 'Kata sandi terlalu panjang.'),
})

export const profileSchema = z.object({
  name,
  phone,
})

export const passwordSchema = z
  .object({
    currentPassword: z
      .string({ error: 'Kata sandi saat ini wajib diisi.' })
      .min(1, 'Kata sandi saat ini wajib diisi.'),
    newPassword: password,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'Kata sandi baru harus berbeda dari kata sandi saat ini.',
  })

export const availabilitySchema = z.object({
  availability: z.enum(['online', 'offline'], {
    error: 'Ketersediaan harus online atau offline.',
  }),
})

export const verificationSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    error: 'Status verifikasi harus approved atau rejected.',
  }),
})

const bookingPlace = z.object({
  address: z
    .string({ error: 'Alamat wajib diisi.' })
    .trim()
    .min(3, 'Alamat minimal 3 karakter.')
    .max(240, 'Alamat maksimal 240 karakter.'),
  lat: z
    .number({ error: 'Koordinat lintang wajib diisi.' })
    .min(-90, 'Koordinat lintang tidak valid.')
    .max(90, 'Koordinat lintang tidak valid.'),
  lng: z
    .number({ error: 'Koordinat bujur wajib diisi.' })
    .min(-180, 'Koordinat bujur tidak valid.')
    .max(180, 'Koordinat bujur tidak valid.'),
})

export const createBookingSchema = z
  .object({
    pickup: bookingPlace,
    destination: bookingPlace,
    vehicle_type: z.enum(['motor', 'mobil'], {
      error: 'Jenis kendaraan tidak valid.',
    }),
    scheduled_at: z.coerce.date({
      error: 'Jadwal penjemputan tidak valid.',
    }),
    notes: z.string().trim().max(200, 'Catatan maksimal 200 karakter.').optional().default(''),
  })
  .refine(
    (data) =>
      data.pickup.lat !== data.destination.lat ||
      data.pickup.lng !== data.destination.lng,
    {
      path: ['destination'],
      message: 'Titik tujuan tidak boleh sama dengan titik penjemputan.',
    },
  )
  .refine((data) => data.scheduled_at.getTime() >= Date.now() - 5 * 60 * 1000, {
    path: ['scheduled_at'],
    message: 'Jadwal penjemputan tidak boleh di masa lalu.',
  })

export const updateBookingSchema = createBookingSchema

export const routeEstimateSchema = z
  .object({
    pickup: bookingPlace,
    destination: bookingPlace,
  })
  .refine(
    (data) =>
      data.pickup.lat !== data.destination.lat ||
      data.pickup.lng !== data.destination.lng,
    {
      path: ['destination'],
      message: 'Titik tujuan tidak boleh sama dengan titik penjemputan.',
    },
  )

export const bookingStatusSchema = z.object({
  status: z.enum(['arrived', 'in_progress', 'completed'], {
    error: 'Status perjalanan tidak valid.',
  }),
})

export const paymentCreateSchema = z.object({
  method: z.literal('cash', {
    error: 'Metode pembayaran hanya mendukung tunai.',
  }),
})

export const paymentConfirmSchema = z.object({
  method: z.enum(['cash']).optional(),
})

export const userListQuerySchema = z.object({
  role: z.enum(['customer', 'driver', 'admin']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const bookingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  unread: z.enum(['1', 'true']).optional(),
})

export const ratingSchema = z.object({
  rating: z.coerce
    .number({ error: 'Rating wajib diisi.' })
    .int('Rating harus bilangan bulat.')
    .min(1, 'Rating minimal 1.')
    .max(5, 'Rating maksimal 5.'),
  comment: z
    .string()
    .trim()
    .max(500, 'Komentar maksimal 500 karakter.')
    .optional()
    .default(''),
})
