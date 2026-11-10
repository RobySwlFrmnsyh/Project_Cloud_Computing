import { api } from './api'

function paramsWithNear(params, near) {
  if (near && Number.isFinite(near.lat) && Number.isFinite(near.lng)) {
    params.set('lat', String(near.lat))
    params.set('lng', String(near.lng))
  }
  return params
}

function isCoordinate(value) {
  if (value === null || value === undefined || value === '') return false
  return Number.isFinite(Number(value))
}

export function hasCoordinates(place) {
  return isCoordinate(place?.lat) && isCoordinate(place?.lng)
}

export async function searchPlaces(query, { limit = 8, signal, near } = {}) {
  const normalized = String(query ?? '').trim()
  if (normalized.length < 2) return []

  const params = paramsWithNear(
    new URLSearchParams({ q: normalized, limit: String(limit) }),
    near,
  )
  const data = await api.get(`/geocode/search?${params}`, { signal })
  return Array.isArray(data?.results) ? data.results : []
}

export async function resolvePlace(place, { signal } = {}) {
  if (!place || hasCoordinates(place) || !place.placeId) return place

  const data = await api.get(
    `/geocode/places/${encodeURIComponent(place.placeId)}`,
    { signal },
  )
  return data?.place ? { ...place, ...data.place } : place
}

export async function reverseGeocode(lat, lng, { signal } = {}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  })
  const data = await api.get(`/geocode/reverse?${params}`, { signal })
  const place = data?.place
  if (!place) throw new Error('Alamat titik ini belum ditemukan.')

  return {
    ...place,
    lat: Number(place.lat ?? lat),
    lng: Number(place.lng ?? lng),
  }
}
