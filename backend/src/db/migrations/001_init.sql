-- Skema awal Tahap 2: Anter Jemput Teman
-- Semua nominal uang disimpan sebagai integer rupiah penuh.

CREATE SEQUENCE IF NOT EXISTS booking_code_seq START WITH 1045;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'driver', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('motor', 'mobil')),
  vehicle_plate TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  availability_status TEXT NOT NULL DEFAULT 'offline'
    CHECK (availability_status IN ('online', 'offline')),
  rating NUMERIC(2, 1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_trips INTEGER NOT NULL DEFAULT 0 CHECK (total_trips >= 0),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  latitude NUMERIC(9, 6) NOT NULL,
  longitude NUMERIC(9, 6) NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE DEFAULT (
    'AJT-' || lpad(nextval('booking_code_seq')::text, 4, '0')
  ),
  customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  driver_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('motor', 'mobil')),
  pickup_location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  destination_location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  distance_km NUMERIC(6, 1) NOT NULL CHECK (distance_km >= 0),
  scheduled_at TIMESTAMPTZ NOT NULL,
  estimated_fare INTEGER NOT NULL CHECK (estimated_fare >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled')),
  notes TEXT NOT NULL DEFAULT '',
  payment_method TEXT CHECK (payment_method IN ('cash', 'qris')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'expired')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cash', 'qris')),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  provider_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS bookings_driver_idx ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);
CREATE INDEX IF NOT EXISTS bookings_available_idx ON bookings(vehicle_type, status)
  WHERE driver_id IS NULL;
CREATE INDEX IF NOT EXISTS payments_booking_idx ON payments(booking_id);
