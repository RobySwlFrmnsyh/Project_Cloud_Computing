import { Router } from 'express'
import { asyncHandler } from '../lib/http.js'
import { resolveRoute } from '../lib/routing.js'
import { routeEstimateSchema } from '../lib/schemas.js'
import { parse } from '../lib/validate.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.post(
  '/estimate',
  asyncHandler(async (req, res) => {
    const data = parse(routeEstimateSchema, req.body)
    const route = await resolveRoute(data.pickup, data.destination)

    res.json({
      success: true,
      message:
        route.provider === 'osrm'
          ? 'Estimasi rute jalan berhasil dihitung.'
          : 'Layanan rute jalan tidak tersedia; memakai estimasi garis lurus.',
      data: {
        route: {
          distance_km: route.distanceKm,
          duration_minutes: route.durationMinutes,
          geometry: route.geometry,
          provider: route.provider,
        },
      },
    })
  }),
)

export default router
