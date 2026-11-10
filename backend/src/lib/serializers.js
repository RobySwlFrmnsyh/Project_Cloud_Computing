function iso(value) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function routeGeometry(value) {
  if (!value) return null
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function serializeUser(row) {
  if (!row) return null

  const user = {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    created_at: iso(row.created_at),
    must_change_password: Boolean(row.must_change_password),
    vehicle: null,
  }

  if (row.role === 'driver' && row.vehicle_type) {
    user.vehicle = {
      type: row.vehicle_type,
      plate: row.vehicle_plate,
      verification_status: row.verification_status,
      availability_status: row.availability_status,
      rating: Number(row.rating),
      total_trips: Number(row.total_trips),
    }
  }

  return user
}

export function serializePaymentRow(row) {
  if (!row || !row.payment_id) return null

  return {
    id: String(row.payment_id),
    method: row.payment_row_method,
    amount: Number(row.payment_amount),
    status: row.payment_row_status,
    created_at: iso(row.payment_created_at),
    paid_at: iso(row.payment_paid_at),
    confirmation_source: row.payment_confirmation_source ?? null,
    confirmed_by:
      row.payment_confirmed_by_id === null || row.payment_confirmed_by_id === undefined
        ? null
        : {
            id: String(row.payment_confirmed_by_id),
            name: row.payment_confirmed_by_name,
            role: row.payment_confirmed_by_role,
          },
  }
}

export function serializeNotification(row) {
  if (!row) return null

  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    message: row.message,
    booking_id: row.booking_id === null ? null : String(row.booking_id),
    booking_code: row.booking_code ?? null,
    read_at: iso(row.read_at),
    created_at: iso(row.created_at),
  }
}

export function serializeBooking(row) {
  if (!row) return null

  return {
    id: row.code,
    code: row.code,
    db_id: String(row.id),
    customer_id: String(row.customer_id),
    driver_id: row.driver_id === null ? null : String(row.driver_id),
    vehicle_type: row.vehicle_type,
    pickup_location_id: row.pickup_location_id ?? null,
    destination_location_id: row.destination_location_id ?? null,
    pickup_location: row.pickup_location_name,
    destination: row.destination_name,
    pickup_coords: {
      lat: Number(row.pickup_lat),
      lng: Number(row.pickup_lng),
    },
    destination_coords: {
      lat: Number(row.destination_lat),
      lng: Number(row.destination_lng),
    },
    distance_km: Number(row.distance_km),
    route_duration_minutes:
      row.route_duration_minutes == null ? null : Number(row.route_duration_minutes),
    route_geometry: routeGeometry(row.route_geometry),
    route_provider: row.route_provider ?? 'haversine',
    scheduled_at: iso(row.scheduled_at),
    estimated_fare: Number(row.estimated_fare),
    status: row.status,
    notes: row.notes,
    rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
    rating_comment: row.rating_comment ?? null,
    rated_at: iso(row.rated_at),
    driver_location:
      row.driver_location_latitude === null || row.driver_location_latitude === undefined
        ? null
        : {
            lat: Number(row.driver_location_latitude),
            lng: Number(row.driver_location_longitude),
            updated_at: iso(row.driver_location_updated_at),
          },
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    paid_at: iso(row.paid_at),
    created_at: iso(row.created_at),
    customer: {
      id: String(row.customer_id),
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      role: 'customer',
    },
    driver:
      row.driver_id === null || !row.driver_name
        ? null
        : {
            id: String(row.driver_id),
            name: row.driver_name,
            email: row.driver_email,
            phone: row.driver_phone,
            role: 'driver',
            vehicle: {
              type: row.driver_vehicle_type,
              plate: row.driver_vehicle_plate,
              verification_status: row.driver_verification_status,
              availability_status: row.driver_availability_status,
              rating: Number(row.driver_rating),
              total_trips: Number(row.driver_total_trips),
            },
          },
    payment: serializePaymentRow(row),
  }
}
