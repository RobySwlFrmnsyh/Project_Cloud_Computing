ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS rating SMALLINT,
  ADD COLUMN IF NOT EXISTS rating_comment TEXT,
  ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_rating_range
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

CREATE INDEX IF NOT EXISTS bookings_driver_rating_idx
  ON bookings(driver_id, rated_at DESC)
  WHERE rating IS NOT NULL;
