import { useEffect, useState } from 'react'
import { divIcon } from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet'
import Icon from '../ui/Icon'
import 'leaflet/dist/leaflet.css'

const INDONESIA_CENTER = [-2.5489, 118.0149]
const INDONESIA_BOUNDS = [
  [-11.2, 94.7],
  [6.3, 141.2],
]
const DEFAULT_ZOOM = 4
const DETAIL_ZOOM = 16

const BASEMAPS = {
  map: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
}

const COLORS = {
  pickup: '#1f6feb',
  destination: '#16a34a',
  driver: '#f59e0b',
}

function markerIcon(color) {
  return divIcon({
    className: 'map-pin-icon',
    html: `<span class="map-pin-icon__pin" style="--marker-color:${color}"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    tooltipAnchor: [0, -12],
  })
}

const PICKUP_ICON = markerIcon(COLORS.pickup)
const DESTINATION_ICON = markerIcon(COLORS.destination)

function toLatLng(point) {
  if (!point) return null
  const coords = point.coords ?? point
  const lat = Number(coords.lat)
  const lng = Number(coords.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return [lat, lng]
}

function labelOf(point, fallback) {
  return point?.label || point?.name || point?.address || fallback
}

function routePath(geometry) {
  if (!Array.isArray(geometry)) return null
  const points = geometry
    .map(([lat, lng]) => [Number(lat), Number(lng)])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
  return points.length >= 2 ? points : null
}

function boundsSignature(points) {
  return points
    .filter(Boolean)
    .map((point) => `${point[0].toFixed(6)},${point[1].toFixed(6)}`)
    .join('|')
}

function FitBounds({ signature, compact }) {
  const map = useMap()

  useEffect(() => {
    if (!signature) return
    const points = signature
      .split('|')
      .map((pair) => pair.split(',').map(Number))
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))

    if (points.length === 0) return
    if (points.length === 1) {
      map.flyTo(points[0], compact ? DETAIL_ZOOM - 1 : DETAIL_ZOOM, { duration: 0.6 })
      return
    }

    map.fitBounds(points, {
      padding: compact ? [18, 18] : [32, 32],
      maxZoom: DETAIL_ZOOM,
    })
  }, [map, signature, compact])

  return null
}

function MapClickHandler({ onSelectPoint }) {
  useMapEvents({
    click(event) {
      onSelectPoint({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })

  return null
}

function PlaceMarker({ kind, point, label, canMove, onMovePoint }) {
  return (
    <Marker
      position={point}
      icon={kind === 'pickup' ? PICKUP_ICON : DESTINATION_ICON}
      draggable={canMove}
      riseOnHover
      zIndexOffset={kind === 'pickup' ? 300 : 200}
      eventHandlers={
        canMove
          ? {
              dragend(event) {
                const latlng = event.target.getLatLng()
                onMovePoint(kind, { lat: latlng.lat, lng: latlng.lng })
              },
            }
          : undefined
      }
    >
      <Tooltip permanent direction="top" offset={[0, -8]}>
        {label}
      </Tooltip>
    </Marker>
  )
}

export default function MapView({
  pickup,
  destination,
  distanceKm,
  durationMinutes,
  routeGeometry,
  driverPoint,
  className = '',
  compact = false,
  tall = false,
  onSelectPoint,
  onMovePoint,
}) {
  const [basemap, setBasemap] = useState('map')
  const pickupPoint = toLatLng(pickup)
  const destinationPoint = toLatLng(destination)
  const driverLatLng = toLatLng(driverPoint)
  const points = [pickupPoint, destinationPoint]
  const signature = boundsSignature(points)
  const center = pickupPoint ?? destinationPoint ?? INDONESIA_CENTER
  const interactive = typeof onSelectPoint === 'function'
  const canMoveMarkers = typeof onMovePoint === 'function'
  const roadPath = routePath(routeGeometry)
  const fallbackPath =
    pickupPoint && destinationPoint ? [pickupPoint, destinationPoint] : null
  const linePath = roadPath ?? fallbackPath
  const activeBasemap = BASEMAPS[basemap]

  const classes = [
    'map',
    compact ? 'map--compact' : '',
    tall ? 'map--tall' : '',
    interactive ? 'map--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      role="region"
      aria-label={`Peta rute dari ${labelOf(pickup, 'lokasi jemput')} ke ${labelOf(
        destination,
        'tujuan',
      )}`}
    >
      <MapContainer
        className="map__canvas"
        center={center}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        scrollWheelZoom={false}
        maxBounds={INDONESIA_BOUNDS}
        maxBoundsViscosity={0.35}
        minZoom={3}
        attributionControl
      >
        <TileLayer
          key={basemap}
          url={activeBasemap.url}
          attribution={activeBasemap.attribution}
          maxZoom={19}
        />
        <ZoomControl position="topright" />
        <ScaleControl position="bottomright" imperial={false} />
        <FitBounds signature={signature} compact={compact} />

        {interactive ? <MapClickHandler onSelectPoint={onSelectPoint} /> : null}

        {pickupPoint ? (
          <PlaceMarker
            kind="pickup"
            point={pickupPoint}
            label={labelOf(pickup, 'Lokasi jemput')}
            canMove={canMoveMarkers}
            onMovePoint={onMovePoint}
          />
        ) : null}

        {destinationPoint ? (
          <PlaceMarker
            kind="destination"
            point={destinationPoint}
            label={labelOf(destination, 'Tujuan')}
            canMove={canMoveMarkers}
            onMovePoint={onMovePoint}
          />
        ) : null}

        {linePath ? (
          <Polyline
            positions={linePath}
            pathOptions={{
              color: COLORS.pickup,
              weight: 4,
              opacity: 0.85,
              dashArray: roadPath ? undefined : '8 10',
            }}
          />
        ) : null}

        {driverLatLng ? (
          <CircleMarker
            center={driverLatLng}
            radius={8}
            pathOptions={{
              color: COLORS.driver,
              fillColor: COLORS.driver,
              fillOpacity: 0.95,
              weight: 3,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              {labelOf(driverPoint, 'Driver')}
            </Tooltip>
          </CircleMarker>
        ) : null}
      </MapContainer>

      {!compact ? (
        <div className="map__layers" role="group" aria-label="Jenis peta">
          <button
            type="button"
            className={basemap === 'map' ? 'is-active' : ''}
            onClick={() => setBasemap('map')}
            aria-pressed={basemap === 'map'}
          >
            Peta
          </button>
          <button
            type="button"
            className={basemap === 'satellite' ? 'is-active' : ''}
            onClick={() => setBasemap('satellite')}
            aria-pressed={basemap === 'satellite'}
          >
            Satelit
          </button>
        </div>
      ) : null}

      <span className="map__badge">
        {interactive ? 'Klik peta atau geser penanda' : 'Peta rute'}
      </span>

      {distanceKm != null ? (
        <div className="map__meta">
          <span>
            <Icon name="map-pin" size={14} />
            {Number(distanceKm).toFixed(1)} km
          </span>
          {durationMinutes != null ? (
            <span>
              <Icon name="clock" size={14} />
              ± {durationMinutes} menit
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
