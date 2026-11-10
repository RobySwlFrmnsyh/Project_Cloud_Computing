import { config } from '../config.js'

const MAPBOX_GEOCODE_URL = 'https://api.mapbox.com/search/geocode/v6'
const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1'
const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'
const PHOTON_URL = 'https://photon.komoot.io'
const USER_AGENT = 'AnterJemputTeman/1.0 (aplikasi demo antar jemput)'
const MAX_ADDRESS_LENGTH = 240
const INDONESIA_BBOX = '94.7,-11.2,141.2,6.3'
const NOMINATIM_MIN_INTERVAL_MS = 1100
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_LIMIT = 100
const REMOTE_AREA_PATTERN =
  /\b(dusun|kampung|desa|kelurahan|kecamatan|kabupaten|kec|kel|rt|rw|gang|gg|blok|jalan|jl|km|patok|simpang|perumahan|komplek)\b/i
const GOOGLE_DETAILS_FIELDS =
  'id,displayName,formattedAddress,location,types,primaryType'

const searchCache = new Map()
const reverseCache = new Map()
let nominatimChain = Promise.resolve()
let lastNominatimAt = 0

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withNominatimSlot(task) {
  const run = nominatimChain.then(async () => {
    const elapsed = Date.now() - lastNominatimAt
    if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
      await wait(NOMINATIM_MIN_INTERVAL_MS - elapsed)
    }
    lastNominatimAt = Date.now()
    return task()
  })

  nominatimChain = run.catch(() => {})
  return run
}

async function fetchJson(url, { method = 'GET', body, headers = {} } = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('Layanan pencarian alamat tidak tersedia di server ini.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.geocodeTimeoutMs)

  try {
    const response = await fetch(url, {
      method,
      body,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        ...headers,
      },
    })

    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok) {
      const error = new Error(
        payload?.error?.message || 'Layanan pencarian alamat sedang tidak tersedia.',
      )
      error.status = response.status
      error.payload = payload
      throw error
    }

    return payload
  } finally {
    clearTimeout(timeout)
  }
}

function cacheGet(cache, key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.value
}

function cacheSet(cache, key, value) {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, { createdAt: Date.now(), value })
}

function uniqueParts(parts) {
  const seen = new Set()
  return parts
    .map((part) => String(part ?? '').trim())
    .filter((part) => {
      if (!part) return false
      const key = part.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function formatCoords(lat, lng) {
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
}

function normalize(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function distanceKm(a, b) {
  const lat1 = Number(a?.lat)
  const lng1 = Number(a?.lng)
  const lat2 = Number(b?.lat)
  const lng2 = Number(b?.lng)
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity

  const toRadians = (value) => (value * Math.PI) / 180
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

export function kindOfMapboxType(featureType) {
  const type = String(featureType ?? '').toLowerCase()
  if (type === 'street' || type === 'block') return 'Jalan'
  if (type === 'address' || type === 'postcode') return 'Alamat'
  if (
    ['place', 'locality', 'neighborhood', 'district', 'region', 'country'].includes(type)
  ) {
    return 'Wilayah'
  }
  return type ? 'Tempat' : 'Alamat'
}

function kindOf(osmKey, osmValue) {
  if (osmKey === 'highway') return 'Jalan'
  if (osmKey === 'place') {
    return ['house', 'houses', 'plot'].includes(osmValue) ? 'Alamat' : 'Wilayah'
  }
  if (osmKey === 'building' || osmKey === 'addr') return 'Alamat'
  if (['amenity', 'shop', 'tourism', 'leisure', 'office'].includes(osmKey)) {
    return 'Tempat'
  }
  return 'Alamat'
}

export function kindOfGoogleTypes(types = []) {
  const values = Array.isArray(types) ? types : []
  if (values.some((type) => ['route', 'plus_code'].includes(type))) return 'Jalan'
  if (
    values.some(
      (type) =>
        type === 'locality' ||
        type === 'sublocality' ||
        type === 'neighborhood' ||
        type === 'political' ||
        type.startsWith('administrative_area_level_'),
    )
  ) {
    return 'Wilayah'
  }
  if (
    values.some((type) =>
      ['street_address', 'premise', 'subpremise', 'postal_code', 'geocode'].includes(type),
    )
  ) {
    return 'Alamat'
  }
  return 'Tempat'
}

function parsePhotonPlace(feature) {
  const coordinates = feature?.geometry?.coordinates
  const lng = Number(coordinates?.[0])
  const lat = Number(coordinates?.[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const props = feature?.properties ?? {}
  if (props.countrycode && props.countrycode !== 'ID') return null

  const streetLine = props.street
    ? uniqueParts([props.street, props.housenumber]).join(' ')
    : ''
  const name = String(props.name ?? '').trim()
  const parts = uniqueParts([
    name,
    streetLine,
    props.district,
    props.city,
    props.county,
    props.state,
    props.postcode,
  ])
  const address = parts.join(', ').slice(0, MAX_ADDRESS_LENGTH)
  const label = name || streetLine || String(props.city ?? '').trim() || 'Lokasi dipilih'

  return {
    lat,
    lng,
    address: address || formatCoords(lat, lng),
    label,
    kind: kindOf(props.osm_key, props.osm_value),
    provider: 'photon',
    importance: Number(props.importance) || 0,
  }
}

function parseNominatimPlace(item) {
  const lat = Number(item?.lat)
  const lng = Number(item?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const addressParts = item?.address ?? {}
  if (addressParts.country_code && addressParts.country_code !== 'id') return null

  const streetLine = uniqueParts([
    addressParts.road,
    addressParts.house_number,
  ]).join(' ')
  const locality =
    addressParts.hamlet ||
    addressParts.village ||
    addressParts.neighbourhood ||
    addressParts.suburb ||
    addressParts.town ||
    addressParts.city ||
    addressParts.municipality ||
    addressParts.county
  const name = String(item?.name ?? '').trim()
  const displayName = String(item?.display_name ?? '').trim()
  const fallbackParts = uniqueParts([
    name,
    streetLine,
    locality,
    addressParts.district,
    addressParts.city,
    addressParts.state,
    addressParts.postcode,
  ])
  const address = (displayName || fallbackParts.join(', ')).slice(0, MAX_ADDRESS_LENGTH)
  const label =
    name ||
    streetLine ||
    String(addressParts.amenity ?? addressParts.shop ?? '').trim() ||
    locality ||
    displayName.split(',')[0]?.trim() ||
    'Lokasi dipilih'

  return {
    lat,
    lng,
    address: address || formatCoords(lat, lng),
    label,
    kind: kindOf(item?.class, item?.type),
    provider: 'nominatim',
    importance: Number(item?.importance) || 0,
  }
}

function scorePlace(place, normalizedQuery, near) {
  const label = normalize(place.label)
  const address = normalize(place.address)
  const tokens = normalizedQuery.split(' ').filter((token) => token.length > 1)
  let score = 0

  if (label === normalizedQuery) score += 140
  else if (label.startsWith(normalizedQuery)) score += 90
  else if (label.includes(normalizedQuery)) score += 55

  if (address === normalizedQuery) score += 70
  else if (address.includes(normalizedQuery)) score += 35

  for (const token of tokens) {
    if (label.includes(token)) score += 12
    if (address.includes(token)) score += 5
  }

  score += Math.min(25, Math.max(0, Number(place.importance) || 0) * 25)
  if (near) score += Math.max(0, 35 - distanceKm(near, place))
  if (place.provider === 'nominatim') score += 2

  return score
}

function dedupePlaces(places) {
  const output = []

  for (const place of places) {
    const duplicate = output.find(
      (item) =>
        distanceKm(item, place) <= 0.08 &&
        (normalize(item.label) === normalize(place.label) ||
          normalize(item.label).includes(normalize(place.label)) ||
          normalize(place.label).includes(normalize(item.label))),
    )

    if (!duplicate) {
      output.push({ ...place })
      continue
    }

    if (place.address.length > duplicate.address.length) {
      duplicate.address = place.address
    }
    if ((place.importance || 0) > (duplicate.importance || 0)) {
      duplicate.importance = place.importance
      duplicate.label = place.label
      duplicate.kind = place.kind
    }
    if (place.provider !== duplicate.provider) duplicate.provider = 'combined'
  }

  return output
}

function searchNeedsNominatim(query, photonPlaces) {
  return photonPlaces.length < 3 || REMOTE_AREA_PATTERN.test(query)
}

async function fetchPhotonPlaces(query, { limit, near }) {
  const params = new URLSearchParams({
    q: query,
    limit: String(Math.max(limit, 8)),
    bbox: INDONESIA_BBOX,
  })

  if (near && Number.isFinite(near.lat) && Number.isFinite(near.lng)) {
    params.set('lat', String(near.lat))
    params.set('lon', String(near.lng))
  }

  const data = await fetchJson(`${PHOTON_URL}/api/?${params}`)
  const features = Array.isArray(data?.features) ? data.features : []
  return features.map(parsePhotonPlace).filter(Boolean)
}

async function fetchNominatimPlaces(query, { limit, near }) {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: String(Math.max(limit, 8)),
    addressdetails: '1',
    dedupe: '1',
    countrycodes: 'id',
    'accept-language': 'id',
  })

  if (near && Number.isFinite(near.lat) && Number.isFinite(near.lng)) {
    params.set(
      'viewbox',
      [
        Number(near.lng) - 1,
        Number(near.lat) + 1,
        Number(near.lng) + 1,
        Number(near.lat) - 1,
      ].join(','),
    )
  }

  return withNominatimSlot(async () => {
    const data = await fetchJson(`${NOMINATIM_URL}/search?${params}`, {
      headers: { 'Accept-Language': 'id' },
    })
    const items = Array.isArray(data) ? data : []
    return items.map(parseNominatimPlace).filter(Boolean)
  })
}

export function parseMapboxFeature(feature) {
  const coordinates = feature?.geometry?.coordinates
  const lng = Number(coordinates?.[0] ?? feature?.properties?.coordinates?.longitude)
  const lat = Number(coordinates?.[1] ?? feature?.properties?.coordinates?.latitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const props = feature?.properties ?? {}
  const name = String(props.name_preferred ?? props.name ?? '').trim()
  const placeFormatted = String(props.place_formatted ?? '').trim()
  const fullAddress = String(props.full_address ?? '').trim()
  const address = (fullAddress || uniqueParts([name, placeFormatted]).join(', ')).slice(
    0,
    MAX_ADDRESS_LENGTH,
  )
  const label =
    name ||
    String(props.address_line1 ?? '').trim() ||
    placeFormatted.split(',')[0]?.trim() ||
    'Lokasi dipilih'

  return {
    lat,
    lng,
    label,
    address: address || formatCoords(lat, lng),
    kind: kindOfMapboxType(props.feature_type),
    provider: 'mapbox',
    importance: Number(props.routable_points?.length ?? 0) ? 0.4 : 0,
    mapboxId: String(props.mapbox_id ?? '').trim() || null,
  }
}

export function parseGoogleAutocomplete(data) {
  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []
  return suggestions
    .map((suggestion) => suggestion?.placePrediction)
    .filter(Boolean)
    .map((prediction) => {
      const mainText = String(prediction.structuredFormat?.mainText?.text ?? '').trim()
      const secondaryText = String(
        prediction.structuredFormat?.secondaryText?.text ?? '',
      ).trim()
      const fullText = String(prediction.text?.text ?? '').trim()
      const label = mainText || fullText.split(',')[0]?.trim() || 'Lokasi dipilih'
      const address =
        uniqueParts([mainText, secondaryText]).join(', ') ||
        fullText ||
        label
      const placeId = String(
        prediction.placeId ??
          String(prediction.place ?? '').replace(/^places\//, ''),
      ).trim()

      if (!placeId) return null

      return {
        placeId,
        lat: null,
        lng: null,
        label,
        address: address.slice(0, MAX_ADDRESS_LENGTH),
        kind: kindOfGoogleTypes(prediction.types),
        provider: 'google',
        distanceMeters: Number(prediction.distanceMeters) || null,
      }
    })
    .filter(Boolean)
}

export function parseGoogleDetails(data) {
  const lat = Number(data?.location?.latitude)
  const lng = Number(data?.location?.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const label = String(data?.displayName?.text ?? '').trim() || 'Lokasi dipilih'
  const address = String(data?.formattedAddress ?? '').trim() || formatCoords(lat, lng)

  return {
    lat,
    lng,
    label,
    address: address.slice(0, MAX_ADDRESS_LENGTH),
    kind: kindOfGoogleTypes(data?.types),
    provider: 'google',
  }
}

function googleHeaders(fieldMask) {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': config.googleMapsApiKey,
    ...(fieldMask ? { 'X-Goog-FieldMask': fieldMask } : {}),
  }
}

async function searchMapboxPlaces(query, { limit, near }) {
  const params = new URLSearchParams({
    q: query,
    access_token: config.mapboxAccessToken,
    language: 'id',
    country: 'id',
    limit: String(Math.max(limit, 5)),
    types: 'address,street,place,locality,neighborhood,district,region,postcode',
    autocomplete: 'true',
  })

  if (near && Number.isFinite(near.lat) && Number.isFinite(near.lng)) {
    params.set('proximity', `${Number(near.lng)},${Number(near.lat)}`)
  }

  const data = await fetchJson(`${MAPBOX_GEOCODE_URL}/forward?${params}`)
  const features = Array.isArray(data?.features) ? data.features : []
  return features.map(parseMapboxFeature).filter(Boolean).slice(0, limit)
}

async function reverseMapbox(lat, lng) {
  const params = new URLSearchParams({
    longitude: String(Number(lng)),
    latitude: String(Number(lat)),
    access_token: config.mapboxAccessToken,
    language: 'id',
    country: 'id',
    limit: '1',
    types: 'address,street,place,locality,neighborhood,district,region,postcode',
  })

  const data = await fetchJson(`${MAPBOX_GEOCODE_URL}/reverse?${params}`)
  const feature = Array.isArray(data?.features) ? data.features[0] : null
  const place = parseMapboxFeature(feature)
  if (!place) return null

  return {
    ...place,
    lat: Number(lat),
    lng: Number(lng),
  }
}

async function searchGooglePlaces(query, { limit, near }) {
  const body = {
    input: query,
    languageCode: 'id',
    includedRegionCodes: ['id'],
  }

  if (near && Number.isFinite(near.lat) && Number.isFinite(near.lng)) {
    body.origin = { latitude: near.lat, longitude: near.lng }
    body.locationBias = {
      circle: {
        center: { latitude: near.lat, longitude: near.lng },
        radius: 50000,
      },
    }
  }

  const data = await fetchJson(`${GOOGLE_PLACES_URL}/places:autocomplete`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: googleHeaders(),
  })

  return parseGoogleAutocomplete(data).slice(0, limit)
}

async function reverseGoogle(lat, lng) {
  const params = new URLSearchParams({
    latlng: `${Number(lat)},${Number(lng)}`,
    language: 'id',
    region: 'id',
    key: config.googleMapsApiKey,
  })
  const data = await fetchJson(`${GOOGLE_GEOCODE_URL}?${params}`)
  if (data?.status !== 'OK') return null

  const item = Array.isArray(data.results) ? data.results[0] : null
  if (!item) return null

  const components = Array.isArray(item.address_components) ? item.address_components : []
  const component = (type) =>
    String(components.find((part) => part.types?.includes(type))?.long_name ?? '').trim()
  const streetLine = uniqueParts([component('route'), component('street_number')]).join(' ')
  const label =
    component('point_of_interest') ||
    component('premise') ||
    component('establishment') ||
    streetLine ||
    component('neighborhood') ||
    component('sublocality') ||
    component('locality') ||
    item.formatted_address?.split(',')[0]?.trim() ||
    'Lokasi dipilih'

  return {
    lat: Number(lat),
    lng: Number(lng),
    label,
    address: String(item.formatted_address ?? '').trim() || formatCoords(lat, lng),
    kind: kindOfGoogleTypes(item.types),
    provider: 'google',
  }
}

function parseNominatimReverse(data, lat, lng) {
  if (!data || data.error) return null

  const addressParts = data.address ?? {}
  const streetLine = uniqueParts([
    addressParts.road,
    addressParts.house_number,
  ]).join(' ')
  const locality =
    addressParts.neighbourhood ||
    addressParts.hamlet ||
    addressParts.village ||
    addressParts.suburb ||
    addressParts.town ||
    addressParts.city ||
    addressParts.district
  const name = String(data.name ?? '').trim()
  const displayName = String(data.display_name ?? '').trim()
  const label =
    name ||
    streetLine ||
    String(addressParts.amenity ?? addressParts.shop ?? '').trim() ||
    locality ||
    displayName.split(',')[0]?.trim() ||
    'Lokasi dipilih'

  return {
    lat: Number(data.lat) || Number(lat),
    lng: Number(data.lon) || Number(lng),
    address:
      (displayName ||
        uniqueParts([
          name,
          streetLine,
          locality,
          addressParts.city,
          addressParts.state,
          addressParts.postcode,
        ]).join(', ')).slice(0, MAX_ADDRESS_LENGTH) || formatCoords(lat, lng),
    label,
    kind: kindOf(data.class, data.type),
    provider: 'nominatim',
  }
}

async function searchOsmPlaces(query, { limit, near }) {
  let photonPlaces = []
  let photonError = null

  try {
    photonPlaces = await fetchPhotonPlaces(query, { limit, near })
  } catch (error) {
    photonError = error
  }

  let nominatimPlaces = []
  let nominatimError = null

  if (searchNeedsNominatim(query, photonPlaces)) {
    try {
      nominatimPlaces = await fetchNominatimPlaces(query, { limit, near })
    } catch (error) {
      nominatimError = error
    }
  }

  if (photonError && nominatimError) {
    throw new Error('Pencarian alamat sedang tidak tersedia. Coba lagi beberapa saat.')
  }

  return dedupePlaces([...photonPlaces, ...nominatimPlaces])
    .sort(
      (a, b) =>
        scorePlace(b, normalize(query), near) - scorePlace(a, normalize(query), near),
    )
    .slice(0, limit)
}

async function reverseOsm(lat, lng) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    zoom: '18',
    addressdetails: '1',
    'accept-language': 'id',
  })

  let nominatimError = null

  try {
    const data = await withNominatimSlot(() =>
      fetchJson(`${NOMINATIM_URL}/reverse?${params}`, {
        headers: { 'Accept-Language': 'id' },
      }),
    )
    const place = parseNominatimReverse(data, lat, lng)
    if (place) return place
  } catch (error) {
    nominatimError = error
  }

  const photonParams = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    limit: '1',
  })

  try {
    const data = await fetchJson(`${PHOTON_URL}/reverse?${photonParams}`)
    const place = parsePhotonPlace(data?.features?.[0])
    if (place) {
      return {
        ...place,
        lat: Number(lat),
        lng: Number(lng),
        address: place.address || formatCoords(lat, lng),
      }
    }
  } catch {
    // Fall through to the user-facing error below.
  }

  if (nominatimError) throw new Error('Alamat titik ini belum dapat diambil.')
  throw new Error('Alamat titik ini belum ditemukan. Coba geser penanda sedikit.')
}

export function geocodeStatus() {
  return {
    mapbox: Boolean(config.mapboxAccessToken),
    google: Boolean(config.googleMapsApiKey),
    active: config.mapboxAccessToken
      ? 'mapbox'
      : config.googleMapsApiKey
        ? 'google'
        : 'osm',
    fallback: 'photon+nominatim',
  }
}

export async function searchPlaces(query, { limit = 8, near = null } = {}) {
  const normalized = String(query ?? '').trim()
  if (normalized.length < 2) return { results: [], provider: 'none' }

  const nearKey =
    near && Number.isFinite(near.lat) && Number.isFinite(near.lng)
      ? `${Number(near.lat).toFixed(3)},${Number(near.lng).toFixed(3)}`
      : ''
  const cacheKey = `mapbox:${Boolean(config.mapboxAccessToken)}|google:${Boolean(config.googleMapsApiKey)}|${normalize(normalized)}|${nearKey}|${limit}`
  const cached = cacheGet(searchCache, cacheKey)
  if (cached) {
    return {
      provider: cached.provider,
      results: cached.results.map((place) => ({ ...place })),
    }
  }

  if (config.mapboxAccessToken) {
    try {
      const results = await searchMapboxPlaces(normalized, { limit, near })
      if (results.length > 0) {
        cacheSet(searchCache, cacheKey, { provider: 'mapbox', results })
        return { provider: 'mapbox', results }
      }
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        console.warn('[geocode] Mapbox menolak token; memakai provider berikutnya.')
      } else {
        console.warn('[geocode] Mapbox gagal; memakai provider berikutnya.')
      }
    }
  }

  if (config.googleMapsApiKey) {
    try {
      const results = await searchGooglePlaces(normalized, { limit, near })
      if (results.length > 0) {
        cacheSet(searchCache, cacheKey, { provider: 'google', results })
        return { provider: 'google', results }
      }
    } catch (error) {
      if (error?.status === 400 || error?.status === 401 || error?.status === 403) {
        console.warn('[geocode] Google Places menolak permintaan; memakai OSM.')
      } else {
        console.warn('[geocode] Google Places gagal; memakai OSM.')
      }
    }
  }

  const results = await searchOsmPlaces(normalized, { limit, near })
  cacheSet(searchCache, cacheKey, { provider: 'osm', results })
  return { provider: 'osm', results }
}

export async function resolveGooglePlace(placeId) {
  if (!config.googleMapsApiKey) {
    throw new Error('Integrasi Google Places belum aktif.')
  }

  const normalizedId = String(placeId ?? '').trim().replace(/^places\//, '')
  if (!normalizedId) throw new Error('ID tempat tidak valid.')

  const params = new URLSearchParams({
    languageCode: 'id',
    regionCode: 'ID',
  })
  const data = await fetchJson(
    `${GOOGLE_PLACES_URL}/places/${encodeURIComponent(normalizedId)}?${params}`,
    { headers: googleHeaders(GOOGLE_DETAILS_FIELDS) },
  )

  return parseGoogleDetails(data)
}

export async function reverseGeocode(lat, lng) {
  const cacheKey = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}|mapbox:${Boolean(config.mapboxAccessToken)}|google:${Boolean(config.googleMapsApiKey)}`
  const cached = cacheGet(reverseCache, cacheKey)
  if (cached) return { ...cached }

  if (config.mapboxAccessToken) {
    try {
      const place = await reverseMapbox(lat, lng)
      if (place) {
        cacheSet(reverseCache, cacheKey, place)
        return { ...place }
      }
    } catch {
      console.warn('[geocode] Mapbox reverse gagal; memakai provider berikutnya.')
    }
  }

  if (config.googleMapsApiKey) {
    try {
      const place = await reverseGoogle(lat, lng)
      if (place) {
        cacheSet(reverseCache, cacheKey, place)
        return { ...place }
      }
    } catch {
      console.warn('[geocode] Google Geocoding gagal; memakai OSM.')
    }
  }

  const place = await reverseOsm(lat, lng)
  cacheSet(reverseCache, cacheKey, place)
  return { ...place }
}
