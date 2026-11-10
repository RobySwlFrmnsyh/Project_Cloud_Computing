CREATE TABLE IF NOT EXISTS driver_locations (
  booking_id BIGINT PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_locations_driver_idx
  ON driver_locations(driver_id, updated_at DESC);
