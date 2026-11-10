CREATE TABLE IF NOT EXISTS booking_declines (
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, driver_id)
);

CREATE INDEX IF NOT EXISTS booking_declines_driver_idx
  ON booking_declines(driver_id, created_at DESC);
