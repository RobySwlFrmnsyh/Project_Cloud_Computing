import dns from 'node:dns'
import net from 'node:net'
import { config } from '../config.js'
import { estimateDurationMinutes, haversineKm } from './fare.js'

dns.setDefaultResultOrder('ipv4first')
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  net.setDefaultAutoSelectFamily(false)
}

const ROUTE_PARAMS = new URLSearchParams({
  overview: 'simplified',
  geometries: 'geojson',
  steps: 'false',
  alternatives: 'false',
})

function toCoords(point) {
  return {
    lat: Number(point?.lat ?? point?.latitude),
    lng: Number(point?.lng ?? point?.longitude),
  }
}

function validCoords(point) {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng)
}

function round(value, decimals) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function fallbackRoute(from, to) {
  const distanceKm = round(haversineKm(from, to), 1)
  return {
    distanceKm,
    durationMinutes: estimateDurationMinutes(distanceKm),
    geometry: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    provider: 'haversine',
  }
}

export function parseOsrmRoute(data) {
  const route = data?.routes?.[0]
  if (data?.code !== 'Ok' || !route) return null

  const distanceKm = Number(route.distance) / 1000
  const durationMinutes = Number(route.duration) / 60
  const coordinates = route.geometry?.coordinates

  if (
    !Number.isFinite(distanceKm) ||
    !Number.isFinite(durationMinutes) ||
    distanceKm < 0 ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2
  ) {
    return null
  }

  const geometry = coordinates
    .map(([lng, lat]) => [Number(lat), Number(lng)])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))

  if (geometry.length < 2) return null

  return {
    distanceKm: round(distanceKm, 1),
    durationMinutes: Math.max(1, Math.round(durationMinutes)),
    geometry,
    provider: 'osrm',
  }
}

export async function resolveRoute(from, to, options = {}) {
  const pickup = toCoords(from)
  const destination = toCoords(to)
  if (!validCoords(pickup) || !validCoords(destination)) {
    throw new Error('Koordinat rute tidak valid.')
  }

  const fallback = fallbackRoute(pickup, destination)
  const enabled = options.enabled ?? config.roadRoutingEnabled
  const baseUrl = options.baseUrl ?? config.osrmBaseUrl
  const fetchImpl = options.fetchImpl ?? globalThis.fetch

  if (!enabled || !baseUrl || typeof fetchImpl !== 'function') return fallback

  const url =
    `${baseUrl}/route/v1/driving/` +
    `${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?${ROUTE_PARAMS}`

  const controller = new AbortController()
  const timeoutMs = Math.max(1000, Number(config.routingTimeoutMs) || 6000)
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AnterJemputTeman/1.0 (demo aplikasi antar jemput)',
      },
    })

    if (!response.ok) return fallback

    const data = await response.json()
    return parseOsrmRoute(data, pickup, destination) ?? fallback
  } catch {
    return fallback
  } finally {
    clearTimeout(timer)
  }
}
