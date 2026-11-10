-- Tahap 4 lanjutan: jarak dan garis peta mengikuti rute jalan (OSRM).
-- Geometri disimpan agar halaman detail tidak perlu memanggil ulang layanan routing.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS route_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS route_geometry JSONB,
  ADD COLUMN IF NOT EXISTS route_provider TEXT NOT NULL DEFAULT 'haversine';

ALTER TABLE bookings
  ADD CONSTRAINT bookings_route_duration_nonnegative
    CHECK (route_duration_minutes IS NULL OR route_duration_minutes >= 0),
  ADD CONSTRAINT bookings_route_geometry_array
    CHECK (route_geometry IS NULL OR jsonb_typeof(route_geometry) = 'array');
