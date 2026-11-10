import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config.js'
import { query } from './db/pool.js'
import { asyncHandler } from './lib/http.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { createRateLimiter } from './middleware/rateLimit.js'
import adminRoutes from './routes/admin.js'
import authRoutes from './routes/auth.js'
import bookingRoutes from './routes/bookings.js'
import driverRoutes from './routes/drivers.js'
import geocodeRoutes from './routes/geocode.js'
import locationRoutes from './routes/locations.js'
import notificationRoutes from './routes/notifications.js'
import paymentRoutes from './routes/payments.js'
import routeRoutes from './routes/routes.js'
import userRoutes from './routes/users.js'

const app = express()

app.disable('x-powered-by')

if (config.isProduction) {
  app.set('trust proxy', 1)
}

app.use(helmet())
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Origin tidak diizinkan oleh CORS.'))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    await query('SELECT 1')
    res.json({
      success: true,
      message: 'API Anter Jemput Teman aktif.',
      data: { status: 'ok', time: new Date().toISOString() },
    })
  }),
)

if (!config.isTest) {
  app.use(
    '/api',
    createRateLimiter({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
    }),
  )
}

const authLimiter = createRateLimiter({
  windowMs: config.rateLimitWindowMs,
  max: config.authRateLimitMax,
  message: 'Terlalu banyak percobaan login. Coba lagi nanti.',
})

if (!config.isTest) {
  app.use('/api/auth/login', authLimiter)
  app.use('/api/auth/register', authLimiter)
}
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/locations', locationRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/routes', routeRoutes)
app.use('/api/geocode', geocodeRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin', adminRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
