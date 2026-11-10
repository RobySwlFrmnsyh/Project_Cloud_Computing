import { Router } from 'express'
import { query } from '../db/pool.js'
import { asyncHandler, HttpError } from '../lib/http.js'
import { serializePaymentRow } from '../lib/serializers.js'
import { authenticate } from '../middleware/auth.js'
const router = Router()

router.use(authenticate)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
      throw new HttpError(404, 'Pembayaran tidak ditemukan.')
    }

    const result = await query(
      `SELECT p.id AS payment_id,
              p.method AS payment_row_method,
              p.amount AS payment_amount,
              p.status AS payment_row_status,
              p.created_at AS payment_created_at,
              p.paid_at AS payment_paid_at,
              p.confirmation_source AS payment_confirmation_source,
              pcu.id AS payment_confirmed_by_id,
              pcu.name AS payment_confirmed_by_name,
              pcu.role AS payment_confirmed_by_role,
              b.code AS booking_code,
              b.customer_id,
              b.driver_id
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       LEFT JOIN users pcu ON pcu.id = p.confirmed_by_user_id
       WHERE p.id = $1`,
      [req.params.id],
    )

    if (result.rowCount === 0) {
      throw new HttpError(404, 'Pembayaran tidak ditemukan.')
    }

    const row = result.rows[0]
    const allowed =
      req.user.role === 'admin' ||
      String(row.customer_id) === req.user.id ||
      (row.driver_id !== null && String(row.driver_id) === req.user.id)

    if (!allowed) {
      throw new HttpError(404, 'Pembayaran tidak ditemukan.')
    }

    res.json({
      success: true,
      message: 'Detail pembayaran.',
      data: {
        payment: {
          ...serializePaymentRow(row),
          booking_id: row.booking_code,
        },
      },
    })
  }),
)

export default router
