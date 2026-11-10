import { Router } from 'express'
import {
  geocodeStatus,
  resolveGooglePlace,
  reverseGeocode,
  searchPlaces,
} from '../lib/geocode.js'
import { asyncHandler, HttpError } from '../lib/http.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

function parseNear(query) {
  const lat = Number(query.lat)
  const lng = Number(query.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

router.get(
  '/status',
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      message: 'Status layanan pencarian alamat.',
      data: geocodeStatus(),
    })
  }),
)

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim()
    if (q.length < 2) {
      throw new HttpError(422, 'Ketik minimal 2 karakter alamat.')
    }

    const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 8))
    const data = await searchPlaces(q, { limit, near: parseNear(req.query) })

    res.json({
      success: true,
      message: 'Saran alamat.',
      data,
    })
  }),
)

router.get(
  '/places/:placeId',
  asyncHandler(async (req, res) => {
    const { placeId } = req.params
    if (!/^[A-Za-z0-9_-]{6,300}$/.test(placeId)) {
      throw new HttpError(400, 'ID tempat tidak valid.')
    }

    if (!geocodeStatus().google) {
      throw new HttpError(
        503,
        'Integrasi Google Places belum aktif. Isi GOOGLE_MAPS_API_KEY di .env.',
      )
    }

    const place = await resolveGooglePlace(placeId)
    if (!place) {
      throw new HttpError(404, 'Detail tempat tidak ditemukan.')
    }

    res.json({
      success: true,
      message: 'Detail tempat.',
      data: { place },
    })
  }),
)

router.get(
  '/reverse',
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat)
    const lng = Number(req.query.lng)
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new HttpError(422, 'Koordinat titik tidak valid.')
    }

    const place = await reverseGeocode(lat, lng)
    res.json({
      success: true,
      message: 'Alamat titik.',
      data: { place },
    })
  }),
)

export default router
