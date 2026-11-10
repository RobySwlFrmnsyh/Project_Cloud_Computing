-- Tahap 4 lanjutan: customer memilih titik jemput/tujuan bebas dari peta.
-- Booking baru menyimpan alamat dan koordinat langsung; relasi ke tabel locations
-- dipertahankan hanya untuk data lama dan menjadi opsional.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pickup_address TEXT,
  ADD COLUMN IF NOT EXISTS pickup_latitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS pickup_longitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS destination_address TEXT,
  ADD COLUMN IF NOT EXISTS destination_latitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS destination_longitude NUMERIC(9, 6);

UPDATE bookings b
SET pickup_address = COALESCE(b.pickup_address, pl.name || ', ' || pl.area),
    pickup_latitude = COALESCE(b.pickup_latitude, pl.latitude),
    pickup_longitude = COALESCE(b.pickup_longitude, pl.longitude)
FROM locations pl
WHERE b.pickup_location_id = pl.id;

UPDATE bookings b
SET destination_address = COALESCE(b.destination_address, dl.name || ', ' || dl.area),
    destination_latitude = COALESCE(b.destination_latitude, dl.latitude),
    destination_longitude = COALESCE(b.destination_longitude, dl.longitude)
FROM locations dl
WHERE b.destination_location_id = dl.id;

UPDATE bookings
SET pickup_address = COALESCE(pickup_address, 'Lokasi penjemputan tidak tercatat'),
    pickup_latitude = COALESCE(pickup_latitude, -6.897000),
    pickup_longitude = COALESCE(pickup_longitude, 107.613000),
    destination_address = COALESCE(destination_address, 'Lokasi tujuan tidak tercatat'),
    destination_latitude = COALESCE(destination_latitude, -6.897000),
    destination_longitude = COALESCE(destination_longitude, 107.613000)
WHERE pickup_address IS NULL
   OR pickup_latitude IS NULL
   OR pickup_longitude IS NULL
   OR destination_address IS NULL
   OR destination_latitude IS NULL
   OR destination_longitude IS NULL;

ALTER TABLE bookings
  ALTER COLUMN pickup_address SET NOT NULL,
  ALTER COLUMN pickup_latitude SET NOT NULL,
  ALTER COLUMN pickup_longitude SET NOT NULL,
  ALTER COLUMN destination_address SET NOT NULL,
  ALTER COLUMN destination_latitude SET NOT NULL,
  ALTER COLUMN destination_longitude SET NOT NULL,
  ALTER COLUMN pickup_location_id DROP NOT NULL,
  ALTER COLUMN destination_location_id DROP NOT NULL;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_pickup_latitude_range
    CHECK (pickup_latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT bookings_pickup_longitude_range
    CHECK (pickup_longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT bookings_destination_latitude_range
    CHECK (destination_latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT bookings_destination_longitude_range
    CHECK (destination_longitude BETWEEN -180 AND 180);

-- Perbaiki data demo lama yang tersimpan dengan jarak NaN dan tarif dasar saja.
WITH recalculated AS (
  SELECT id,
         round((
           6371 * 2 * asin(sqrt(
             power(sin(radians(destination_latitude - pickup_latitude) / 2), 2) +
             cos(radians(pickup_latitude)) * cos(radians(destination_latitude)) *
             power(sin(radians(destination_longitude - pickup_longitude) / 2), 2)
           ))
         )::numeric, 1) AS distance
  FROM bookings
  WHERE distance_km = 'NaN'::numeric
)
UPDATE bookings b
SET distance_km = r.distance,
    estimated_fare = (
      ceil((
        CASE b.vehicle_type WHEN 'mobil' THEN 12000 ELSE 8000 END +
        (CASE b.vehicle_type WHEN 'mobil' THEN 4200 ELSE 2600 END) * r.distance
      ) / 500) * 500
    )::integer
FROM recalculated r
WHERE b.id = r.id;
