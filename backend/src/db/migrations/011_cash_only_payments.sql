UPDATE payments p
SET method = 'cash',
    status = CASE
      WHEN p.status IN ('failed', 'expired') THEN 'pending'
      ELSE p.status
    END,
    provider_ref = NULL,
    expires_at = NULL,
    qr_payload = NULL,
    confirmation_source = CASE WHEN p.status = 'paid' THEN 'driver' ELSE NULL END,
    confirmed_by_user_id = CASE WHEN p.status = 'paid' THEN b.driver_id ELSE NULL END,
    updated_at = now()
FROM bookings b
WHERE b.id = p.booking_id
  AND p.method = 'qris';

UPDATE bookings
SET payment_method = 'cash',
    payment_status = CASE
      WHEN payment_status IN ('failed', 'expired') THEN 'pending'
      ELSE payment_status
    END,
    updated_at = now()
WHERE payment_method = 'qris';

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_method_check CHECK (method = 'cash');

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IS NULL OR payment_method = 'cash');
