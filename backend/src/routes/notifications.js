import { Router } from 'express'
import { asyncHandler, HttpError } from '../lib/http.js'
import { notificationListQuerySchema } from '../lib/schemas.js'
import { parse } from '../lib/validate.js'
import { authenticate } from '../middleware/auth.js'
import {
  listNotificationsFor,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notifications.js'

const router = Router()

router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parse(notificationListQuerySchema, req.query)
    const data = await listNotificationsFor(req.user.id, {
      page: query.page ?? 1,
      limit: query.limit ?? 30,
      unread: query.unread === '1' || query.unread === 'true',
    })

    res.json({
      success: true,
      message: 'Daftar notifikasi.',
      data,
    })
  }),
)

router.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    const changed = await markAllNotificationsRead(req.user.id)
    res.json({
      success: true,
      message: 'Semua notifikasi ditandai sudah dibaca.',
      data: { changed },
    })
  }),
)

router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
      throw new HttpError(404, 'Notifikasi tidak ditemukan.')
    }

    const notification = await markNotificationRead(req.user.id, req.params.id)
    if (!notification) {
      throw new HttpError(404, 'Notifikasi tidak ditemukan.')
    }

    res.json({
      success: true,
      message: 'Notifikasi ditandai sudah dibaca.',
      data: { notification },
    })
  }),
)

export default router
