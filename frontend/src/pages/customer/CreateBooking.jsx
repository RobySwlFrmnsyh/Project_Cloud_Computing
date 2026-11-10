import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MapView from '../../components/booking/MapView'
import PlaceAutocomplete from '../../components/booking/PlaceAutocomplete'
import RouteInfo from '../../components/booking/RouteInfo'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { Card, CardHeader } from '../../components/ui/Card'
import { TextAreaField } from '../../components/ui/Field'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import { useToast } from '../../components/ui/Toast'
import { useData } from '../../context/DataContext'
import { api } from '../../lib/api'
import { VEHICLES } from '../../lib/constants'
import { estimateDurationMinutes, estimateFare, haversineKm } from '../../lib/fare'
import { formatCurrency, formatDateTime } from '../../lib/format'
import { reverseGeocode } from '../../lib/geocode'

function toLocalInput(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

function defaultSchedule() {
  const date = new Date(Date.now() + 60 * 60 * 1000)
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0)
  return toLocalInput(date)
}

const SERVER_FIELD_MAP = {
  'pickup.address': 'pickup',
  'pickup.lat': 'pickup',
  'pickup.lng': 'pickup',
  'destination.address': 'destination',
  'destination.lat': 'destination',
  'destination.lng': 'destination',
  destination: 'destination',
  vehicle_type: 'vehicle',
  scheduled_at: 'scheduledAt',
  notes: 'notes',
}

function coordKey(point) {
  return `${Number(point.lat).toFixed(6)},${Number(point.lng).toFixed(6)}`
}

function localFallbackRoute(pickup, destination) {
  const distanceKm = Number(haversineKm(pickup, destination).toFixed(1))
  return {
    distance_km: distanceKm,
    duration_minutes: estimateDurationMinutes(distanceKm),
    geometry: [
      [pickup.lat, pickup.lng],
      [destination.lat, destination.lng],
    ],
    provider: 'haversine',
  }
}

export default function CreateBooking() {
  const { bookings, loading, createBooking, updateBooking } = useData()
  const { push } = useToast()
  const navigate = useNavigate()
  const { bookingId } = useParams()
  const isEdit = Boolean(bookingId)
  const editBooking = isEdit
    ? bookings.find((booking) => booking.id === bookingId)
    : null

  const [pickup, setPickup] = useState(null)
  const [destination, setDestination] = useState(null)
  const [pickMode, setPickMode] = useState('pickup')
  const [scheduleMode, setScheduleMode] = useState('now')
  const [scheduledAt, setScheduledAt] = useState(defaultSchedule)
  const [vehicleType, setVehicleType] = useState('motor')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [routeInfo, setRouteInfo] = useState(null)
  const [routing, setRouting] = useState(false)
  const [routeError, setRouteError] = useState('')

  const reverseTimer = useRef(null)
  const reverseAbort = useRef(null)
  const routeAbort = useRef(null)
  const editInitialized = useRef(false)

  const pickupKey = pickup ? coordKey(pickup) : ''
  const destinationKey = destination ? coordKey(destination) : ''
  const distance = routeInfo?.distance_km ?? 0
  const fare = useMemo(() => estimateFare(distance, vehicleType), [distance, vehicleType])

  useEffect(
    () => () => {
      clearTimeout(reverseTimer.current)
      reverseAbort.current?.abort()
      routeAbort.current?.abort()
    },
    [],
  )

  useEffect(() => {
    if (!editBooking || editInitialized.current) return
    editInitialized.current = true

    setPickup({
      address: editBooking.pickup_location,
      label: editBooking.pickup_location,
      lat: editBooking.pickup_coords.lat,
      lng: editBooking.pickup_coords.lng,
    })
    setDestination({
      address: editBooking.destination,
      label: editBooking.destination,
      lat: editBooking.destination_coords.lat,
      lng: editBooking.destination_coords.lng,
    })
    setVehicleType(editBooking.vehicle_type)
    setNotes(editBooking.notes ?? '')
    setScheduleMode('later')
    setScheduledAt(toLocalInput(new Date(editBooking.scheduled_at)))
    setRouteInfo({
      distance_km: editBooking.distance_km,
      duration_minutes: editBooking.route_duration_minutes,
      geometry: editBooking.route_geometry,
      provider: editBooking.route_provider,
    })
  }, [editBooking])

  useEffect(() => {
    routeAbort.current?.abort()
    setRouteError('')

    if (!pickupKey || !destinationKey || pickupKey === destinationKey) {
      setRouteInfo(null)
      setRouting(false)
      return undefined
    }

    const [pickupLat, pickupLng] = pickupKey.split(',').map(Number)
    const [destinationLat, destinationLng] = destinationKey.split(',').map(Number)
    const controller = new AbortController()
    routeAbort.current = controller
    setRouting(true)

    const timer = setTimeout(async () => {
      try {
        const data = await api.post(
          '/routes/estimate',
          {
            pickup: {
              address: 'Titik jemput',
              lat: pickupLat,
              lng: pickupLng,
            },
            destination: {
              address: 'Titik tujuan',
              lat: destinationLat,
              lng: destinationLng,
            },
          },
          { signal: controller.signal },
        )

        if (controller.signal.aborted) return
        setRouteInfo(data.route)
        if (data.route.provider !== 'osrm') {
          setRouteError(
            'Layanan rute jalan sedang tidak tersedia. Estimasi memakai garis lurus.',
          )
        }
      } catch (error) {
        if (error.name === 'AbortError' || controller.signal.aborted) return
        setRouteInfo(
          localFallbackRoute(
            { lat: pickupLat, lng: pickupLng },
            { lat: destinationLat, lng: destinationLng },
          ),
        )
        setRouteError(
          'Rute jalan belum dapat dihitung. Estimasi memakai garis lurus.',
        )
      } finally {
        if (!controller.signal.aborted) setRouting(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [pickupKey, destinationKey])

  const applyPoint = (target, point) => {
    if (target === 'pickup') setPickup(point)
    else setDestination(point)

    setErrors((prev) => ({ ...prev, pickup: undefined, destination: undefined }))
    setPickMode(target === 'pickup' ? 'destination' : 'pickup')
  }

  const choosePoint = (target, point) => {
    const other = target === 'pickup' ? destination : pickup
    if (other && coordKey(other) === coordKey(point)) {
      setErrors((prev) => ({
        ...prev,
        [target]:
          target === 'pickup'
            ? 'Titik jemput tidak boleh sama dengan titik tujuan.'
            : 'Titik tujuan tidak boleh sama dengan titik jemput.',
      }))
      return false
    }

    applyPoint(target, point)
    return true
  }

  const resolveAddress = (target, point) => {
    clearTimeout(reverseTimer.current)
    reverseAbort.current?.abort()

    const controller = new AbortController()
    reverseAbort.current = controller

    reverseTimer.current = setTimeout(async () => {
      try {
        const resolved = await reverseGeocode(point.lat, point.lng, {
          signal: controller.signal,
        })
        const matches = (current) => current && coordKey(current) === coordKey(point)

        if (target === 'pickup') {
          setPickup((current) =>
            matches(current)
              ? { ...current, address: resolved.address, label: resolved.label }
              : current,
          )
        } else {
          setDestination((current) =>
            matches(current)
              ? { ...current, address: resolved.address, label: resolved.label }
              : current,
          )
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          // Alamat sementara berupa koordinat tetap dipakai bila layanan gagal.
        }
      }
    }, 650)
  }

  const handlePointSelect = (target, { lat, lng }) => {
    const point = {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      label: 'Titik pada peta',
    }

    if (choosePoint(target, point)) resolveAddress(target, point)
  }

  const handleMapSelect = ({ lat, lng }) => handlePointSelect(pickMode, { lat, lng })

  const handleClear = (target) => {
    if (target === 'pickup') setPickup(null)
    else setDestination(null)
    setErrors((prev) => ({ ...prev, [target]: undefined }))
  }

  const handleSwap = () => {
    setPickup(destination)
    setDestination(pickup)
    setErrors({})
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!pickup) nextErrors.pickup = 'Tentukan alamat penjemputan.'
    if (!destination) nextErrors.destination = 'Tentukan alamat tujuan.'
    if (pickup && destination && coordKey(pickup) === coordKey(destination)) {
      nextErrors.destination = 'Titik tujuan tidak boleh sama dengan titik penjemputan.'
    }
    if (scheduleMode === 'later') {
      if (!scheduledAt) {
        nextErrors.scheduledAt = 'Tentukan waktu penjemputan.'
      } else if (new Date(scheduledAt).getTime() <= Date.now()) {
        nextErrors.scheduledAt = 'Jadwal harus berada di masa mendatang.'
      }
    }
    if (notes.length > 200) {
      nextErrors.notes = 'Catatan maksimal 200 karakter.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !pickup || !destination) return

    setSubmitting(true)

    try {
      const payload = {
        pickup: {
          address: pickup.address,
          lat: pickup.lat,
          lng: pickup.lng,
        },
        destination: {
          address: destination.address,
          lat: destination.lat,
          lng: destination.lng,
        },
        vehicle_type: vehicleType,
        scheduled_at:
          scheduleMode === 'now'
            ? new Date().toISOString()
            : new Date(scheduledAt).toISOString(),
        notes: notes.trim(),
      }
      const booking = isEdit
        ? await updateBooking(bookingId, payload)
        : await createBooking(payload)

      push({
        title: isEdit ? 'Pesanan berhasil diperbarui' : 'Pesanan berhasil dibuat',
        message: isEdit
          ? `${booking.id} kembali menunggu driver dengan detail terbaru.`
          : `${booking.id} menunggu driver menerima pesanan.`,
      })
      navigate(`/app/bookings/${booking.id}`)
    } catch (error) {
      if (error.errors) {
        const mapped = {}
        for (const [field, message] of Object.entries(error.errors)) {
          mapped[SERVER_FIELD_MAP[field] ?? field] = message
        }
        setErrors(mapped)
      }
      push({
        variant: 'error',
        title: isEdit ? 'Pesanan gagal diperbarui' : 'Pesanan gagal dibuat',
        message: error.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (isEdit && loading && !editBooking) {
    return <PageLoader label="Memuat pesanan..." />
  }

  if (isEdit && !editBooking) {
    return (
      <Card>
        <EmptyState
          icon="alert"
          title="Pesanan tidak ditemukan"
          description="Pesanan ini tidak tersedia atau sudah tidak dapat diubah."
        >
          <Button to="/app/history" variant="outline" icon="arrow-left">
            Kembali ke riwayat
          </Button>
        </EmptyState>
      </Card>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? `Ubah ${editBooking.id}` : 'Pesanan baru'}
        title={isEdit ? 'Ubah detail pesanan' : 'Buat pesanan perjalanan'}
        description={
          isEdit
            ? 'Perbarui rute, jadwal, kendaraan, atau catatan selama pesanan belum diterima driver.'
            : 'Cari alamat penjemputan dan tujuan hingga tingkat jalan, dusun, desa, atau tempat. Kamu juga bisa menandai dan menggeser titik langsung di peta.'
        }
        actions={
          <Button
            to={isEdit ? `/app/bookings/${editBooking.id}` : '/app'}
            variant="outline"
            icon="arrow-left"
          >
            Kembali
          </Button>
        }
      />

      <form className="booking-form" onSubmit={handleSubmit} noValidate>
        <div className="booking-form__main">
          <Card>
            <CardHeader
              title="Rute perjalanan"
              subtitle="Ketik alamat untuk melihat saran, atau pilih titik langsung di peta."
            />

            <div className="route-picker">
              <div className="route-picker__line" aria-hidden="true">
                <span className="route-picker__dot" />
                <span className="route-picker__bar" />
                <span className="route-picker__dot route-picker__dot--end" />
              </div>

              <div className="route-picker__fields">
                <div className="route-address">
                  <PlaceAutocomplete
                    label="Titik jemput"
                    icon="map-pin"
                    value={pickup}
                    active={pickMode === 'pickup'}
                    placeholder="Cari jalan, dusun, desa, atau tempat..."
                    near={destination}
                    onActivate={() => setPickMode('pickup')}
                    onSelect={(point) => choosePoint('pickup', point)}
                    onClear={() => handleClear('pickup')}
                    error={errors.pickup}
                  />
                </div>

                <button
                  type="button"
                  className="swap-btn"
                  onClick={handleSwap}
                  aria-label="Tukar titik jemput dan tujuan"
                >
                  <Icon name="refresh" size={16} />
                </button>

                <div className="route-address">
                  <PlaceAutocomplete
                    label="Titik tujuan"
                    icon="navigation"
                    value={destination}
                    active={pickMode === 'destination'}
                    placeholder="Cari jalan, dusun, desa, atau tempat..."
                    near={pickup}
                    onActivate={() => setPickMode('destination')}
                    onSelect={(point) => choosePoint('destination', point)}
                    onClear={() => handleClear('destination')}
                    error={errors.destination}
                  />
                </div>
              </div>
            </div>

            <div className="route-map">
              <div className="route-map__toolbar">
                <span className="field__label">Atau pilih langsung di peta</span>
                <div className="segmented" role="group" aria-label="Titik yang dipilih">
                  <button
                    type="button"
                    className={['segmented__item', pickMode === 'pickup' ? 'is-active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setPickMode('pickup')}
                    aria-pressed={pickMode === 'pickup'}
                  >
                    <Icon name="map-pin" size={15} />
                    Titik jemput
                  </button>
                  <button
                    type="button"
                    className={[
                      'segmented__item',
                      pickMode === 'destination' ? 'is-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setPickMode('destination')}
                    aria-pressed={pickMode === 'destination'}
                  >
                    <Icon name="navigation" size={15} />
                    Titik tujuan
                  </button>
                </div>
              </div>

              <MapView
                pickup={pickup}
                destination={destination}
                distanceKm={routeInfo ? routeInfo.distance_km : null}
                durationMinutes={routeInfo ? routeInfo.duration_minutes : null}
                routeGeometry={routeInfo?.geometry}
                tall
                onSelectPoint={handleMapSelect}
                onMovePoint={handlePointSelect}
              />

              {routing ? (
                <p className="field__hint">Menghitung rute jalan...</p>
              ) : null}
              {routeError ? (
                <p className="field__hint place-search__error">{routeError}</p>
              ) : null}

              <p className="field__hint">
                Mode aktif:{' '}
                <strong>{pickMode === 'pickup' ? 'titik jemput' : 'titik tujuan'}</strong>.
                Ketik minimal 2 karakter untuk mencari alamat, atau klik peta. Setelah
                penanda muncul, geser penanda untuk memperbaiki titik secara presisi.
              </p>
            </div>

            <div className="form-row">
              <div className="field">
                <span className="field__label">Waktu penjemputan</span>
                <div className="segmented" role="group" aria-label="Waktu penjemputan">
                  <button
                    type="button"
                    className={['segmented__item', scheduleMode === 'now' ? 'is-active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setScheduleMode('now')}
                    aria-pressed={scheduleMode === 'now'}
                  >
                    <Icon name="zap" size={15} />
                    Sekarang
                  </button>
                  <button
                    type="button"
                    className={['segmented__item', scheduleMode === 'later' ? 'is-active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setScheduleMode('later')}
                    aria-pressed={scheduleMode === 'later'}
                  >
                    <Icon name="calendar" size={15} />
                    Jadwalkan
                  </button>
                </div>
                {scheduleMode === 'now' ? (
                  <p className="field__hint">
                    Driver akan diproses segera setelah pesanan dikonfirmasi.
                  </p>
                ) : null}
              </div>

              {scheduleMode === 'later' ? (
                <div className="field">
                  <label className="field__label" htmlFor="scheduled-at">
                    Tanggal dan jam
                  </label>
                  <input
                    id="scheduled-at"
                    type="datetime-local"
                    className={['input', errors.scheduledAt ? 'input--error' : '']
                      .filter(Boolean)
                      .join(' ')}
                    value={scheduledAt}
                    min={toLocalInput(new Date())}
                    onChange={(event) => {
                      setScheduledAt(event.target.value)
                      setErrors((prev) => ({ ...prev, scheduledAt: undefined }))
                    }}
                    aria-invalid={Boolean(errors.scheduledAt)}
                  />
                  {errors.scheduledAt ? (
                    <p className="field__error" role="alert">
                      <Icon name="alert" size={14} />
                      {errors.scheduledAt}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Pilihan kendaraan"
              subtitle="Tarif berbeda mengikuti jenis kendaraan yang dipilih."
            />
            <div className="vehicle-grid" role="group" aria-label="Pilihan kendaraan">
              {VEHICLES.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  className={[
                    'vehicle-option',
                    vehicleType === vehicle.id ? 'is-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setVehicleType(vehicle.id)}
                  aria-pressed={vehicleType === vehicle.id}
                >
                  <span className="vehicle-option__icon" aria-hidden="true">
                    <Icon name={vehicle.id === 'motor' ? 'bike' : 'car'} size={20} />
                  </span>
                  <span className="vehicle-option__text">
                    <strong>{vehicle.label}</strong>
                    <small>{vehicle.description}</small>
                  </span>
                  <span className="vehicle-option__check" aria-hidden="true">
                    <Icon name="check" size={13} />
                  </span>
                </button>
              ))}
            </div>

            <TextAreaField
              id="booking-notes"
              label="Catatan untuk driver"
              placeholder="Contoh: tunggu di gerbang utama, bawa helm tambahan."
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value)
                setErrors((prev) => ({ ...prev, notes: undefined }))
              }}
              error={errors.notes}
              hint={`${notes.length}/200 karakter`}
              rows={3}
            />
          </Card>

          <div className="notice notice--info">
            <Icon name="info" size={18} />
            <p>
              <strong>Estimasi tarif dihitung di server</strong> dari jarak rute jalan
              (OSRM) ditambah tarif per kilometer. Angka pada ringkasan ini adalah pratinjau;
              nilai final yang tersimpan mengikuti hasil perhitungan backend.
            </p>
          </div>
        </div>

        <aside className="booking-form__side">
          <Card className="sticky-card">
            <CardHeader title="Ringkasan pesanan" />

            <div className="summary-route">
              <RouteInfo
                pickup={pickup ? pickup.label || pickup.address : 'Belum dipilih'}
                destination={
                  destination ? destination.label || destination.address : 'Belum dipilih'
                }
              />
            </div>

            <dl className="summary-list">
              <div className="summary-row">
                <dt>Jarak rute</dt>
                <dd>
                  {routeInfo
                    ? `${Number(routeInfo.distance_km).toFixed(1)} km`
                    : routing
                      ? 'Menghitung...'
                      : '—'}
                </dd>
              </div>
              <div className="summary-row">
                <dt>Durasi rute</dt>
                <dd>
                  {routeInfo
                    ? `± ${routeInfo.duration_minutes} menit`
                    : routing
                      ? 'Menghitung...'
                      : '—'}
                </dd>
              </div>
              <div className="summary-row">
                <dt>Tarif dasar</dt>
                <dd>{formatCurrency(fare.base)}</dd>
              </div>
              <div className="summary-row">
                <dt>
                  Tarif per km
                  <small>
                    {formatCurrency(fare.perKm)} ×{' '}
                    {routeInfo ? `${Number(routeInfo.distance_km).toFixed(1)} km` : '—'}
                  </small>
                </dt>
                <dd>{routeInfo ? formatCurrency(fare.distanceCost) : '—'}</dd>
              </div>
              <div className="summary-row summary-row--total">
                <dt>Estimasi total</dt>
                <dd>{routeInfo ? formatCurrency(fare.total) : '—'}</dd>
              </div>
              <div className="summary-row">
                <dt>Jadwal</dt>
                <dd>
                  {scheduleMode === 'now'
                    ? 'Sekarang'
                    : scheduledAt
                      ? formatDateTime(new Date(scheduledAt))
                      : '—'}
                </dd>
              </div>
            </dl>

            <Button
              type="submit"
              size="lg"
              block
              trailingIcon="arrow-right"
              disabled={submitting}
            >
              {submitting
                ? 'Menyimpan...'
                : isEdit
                  ? 'Simpan perubahan'
                  : 'Konfirmasi pesanan'}
            </Button>
            <p className="sticky-card__note">
              {isEdit
                ? 'Perubahan hanya dapat dilakukan sebelum driver menerima pesanan.'
                : 'Pesanan akan berstatus '}
              {!isEdit ? <strong>menunggu driver</strong> : null}
              {!isEdit ? ' setelah dikonfirmasi.' : null}
            </p>
          </Card>
        </aside>
      </form>
    </>
  )
}
