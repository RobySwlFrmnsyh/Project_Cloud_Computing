import { Router } from 'express'
import { query } from '../db/pool.js'
import { asyncHandler } from '../lib/http.js'

const router = Router()

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT id, name, area, latitude, longitude
       FROM locations
       ORDER BY name ASC`,
    )

    const locations = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      area: row.area,
      coords: { lat: Number(row.latitude), lng: Number(row.longitude) },
    }))

    res.json({ success: true, message: 'Daftar lokasi.', data: { locations } })
  }),
)

export default router
