export const VEHICLE_RATES = {
  motor: { base: 8000, perKm: 2600 },
  mobil: { base: 12000, perKm: 4200 },
}

const EARTH_RADIUS_KM = 6371

export function haversineKm(from, to) {
  if (!from || !to) return 0

  const toRad = (value) => (value * Math.PI) / 180
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)

  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

export function estimateFare(distanceKm, vehicleType = 'motor') {
  const rate = VEHICLE_RATES[vehicleType] ?? VEHICLE_RATES.motor
  const distance = Math.max(0, Number(distanceKm) || 0)
  const distanceCost = rate.perKm * distance
  const raw = rate.base + distanceCost
  const total = Math.ceil(raw / 500) * 500

  return {
    base: rate.base,
    perKm: rate.perKm,
    distance,
    distanceCost: Math.round(distanceCost),
    total,
  }
}

export function estimateDurationMinutes(distanceKm) {
  const distance = Math.max(0, Number(distanceKm) || 0)
  return Math.max(5, Math.round((distance / 28) * 60) + 4)
}
