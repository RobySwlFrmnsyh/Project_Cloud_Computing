import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Avatar from '../../components/ui/Avatar'
import MapPreview from '../../components/booking/MapPreview'
import RouteInfo from '../../components/booking/RouteInfo'
import TripTimeline from '../../components/booking/TripTimeline'
import PaymentReceipt from '../../components/payment/PaymentReceipt'
import { PaymentBadge, StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { VEHICLE_LABEL } from '../../lib/constants'
import { estimateDurationMinutes } from '../../lib/fare'
import { formatCurrency, formatDateTime } from '../../lib/format'

const ACTION_BY_STATUS = {
  accepted: {
    next: 'arrived',
    label: 'Saya sudah tiba di titik jemput',
    message: 'Status berubah menjadi driver tiba.',
  },
  arrived: {
    next: 'in_progress',
    label: 'Mulai perjalanan',
    message: 'Perjalanan menuju tujuan dimulai.',
  },
  in_progress: {
    next: 'completed',
    label: 'Selesaikan perjalanan',
    message: 'Perjalanan selesai.',
  },
}

export default function DriverOrderDetail() {
  const { bookingId } = useParams()
  const { user } = useAuth()
  const {
    bookings,
    loading,
    updateBookingStatus,
    createPayment,
    confirmPayment,
    shareDriverLocation,
    socketConnected,
  } = useData()
  const { push } = useToast()
  const [finishOpen, setFinishOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sharingLocation, setSharingLocation] = useState(false)
  const [locationNote, setLocationNote] = useState('')

  const booking = bookings.find((candidate) => candidate.id === bookingId)
  const canShareLocation = booking
    ? ['accepted', 'arrived', 'in_progress'].includes(booking.status)
    : false

  useEffect(() => {
    if (!sharingLocation || !booking || !canShareLocation) return undefined

    const watchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const result = await shareDriverLocation(
          booking.id,
          coords.latitude,
          coords.longitude,
        )
        setLocationNote(
          result.ok
            ? `Lokasi terkirim: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
            : result.message,
        )
      },
      (error) => {
        setLocationNote(error.message || 'Izin lokasi tidak tersedia.')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [sharingLocation, booking, canShareLocation, shareDriverLocation])

  if (loading && !booking) {
    return <PageLoader label="Memuat detail pesanan..." />
  }

  if (!booking || booking.driver_id !== user.id) {
    return (
      <Card>
        <EmptyState
          icon="alert"
          title="Pesanan tidak ditemukan"
          description="Pesanan ini bukan milikmu atau sudah ditugaskan ke driver lain."
        >
          <Button to="/driver" icon="arrow-left">
            Kembali ke dashboard
          </Button>
        </EmptyState>
      </Card>
    )
  }

  const customer = booking.customer
  const action = ACTION_BY_STATUS[booking.status]
  const needsCash =
    booking.status === 'completed' && booking.payment_status !== 'paid'

  const toggleLocationSharing = () => {
    if (!sharingLocation && !navigator.geolocation) {
      setLocationNote('Browser ini tidak mendukung Geolocation API.')
      return
    }
    setSharingLocation((previous) => !previous)
  }

  const handleAdvance = async () => {
    if (!action) return

    if (booking.status === 'in_progress') {
      setFinishOpen(true)
      return
    }

    setBusy(true)
    try {
      await updateBookingStatus(booking.id, action.next)
      push({ title: 'Status diperbarui', message: action.message, variant: 'info' })
    } catch (error) {
      push({ variant: 'error', title: 'Gagal memperbarui status', message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const handleFinish = async () => {
    setBusy(true)
    try {
      await updateBookingStatus(booking.id, 'completed')
      setFinishOpen(false)
      push({
        title: 'Perjalanan selesai',
        message: 'Minta customer menyelesaikan pembayaran tunai.',
      })
    } catch (error) {
      push({ variant: 'error', title: 'Gagal menyelesaikan', message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const handleCollectCash = async () => {
    setBusy(true)
    try {
      if (!booking.payment) {
        await createPayment(booking.id, 'cash')
      }
      await confirmPayment(booking.id)
      push({
        title: 'Pembayaran tunai dikonfirmasi',
        message: 'Simulasi: transaksi ditandai lunas. Tidak ada uang sungguhan yang diproses.',
      })
    } catch (error) {
      push({ variant: 'error', title: 'Gagal mengonfirmasi tunai', message: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`Pesanan ${booking.id}`}
        title="Detail pesanan driver"
        description={`Dijadwalkan ${formatDateTime(booking.scheduled_at)} · ${VEHICLE_LABEL[booking.vehicle_type] ?? booking.vehicle_type}`}
        actions={
          <Button to="/driver" variant="outline" icon="arrow-left">
            Dashboard
          </Button>
        }
      />

      <div className="detail-grid">
        <div className="detail-main">
          <Card>
            <div className="trip-hero">
              <div className="trip-hero__head">
                <div>
                  <div className="trip-hero__badges">
                    <StatusBadge status={booking.status} />
                    <PaymentBadge status={booking.payment_status} />
                  </div>
                  <h2 className="trip-hero__title">
                    {booking.pickup_location} → {booking.destination}
                  </h2>
                  <p className="trip-hero__meta">
                    <Icon name="calendar" size={15} />
                    {formatDateTime(booking.scheduled_at)}
                  </p>
                </div>
                <span className="trip-hero__fare">
                  <small>Pendapatan</small>
                  {formatCurrency(booking.estimated_fare)}
                </span>
              </div>

              <MapPreview
                pickup={{
                  label: booking.pickup_location.split(',')[0],
                  address: booking.pickup_location,
                  coords: booking.pickup_coords,
                }}
                destination={{
                  label: booking.destination.split(',')[0],
                  address: booking.destination,
                  coords: booking.destination_coords,
                }}
                distanceKm={booking.distance_km}
                durationMinutes={
                  booking.route_duration_minutes ??
                  estimateDurationMinutes(booking.distance_km)
                }
                routeGeometry={booking.route_geometry}
              />

              <RouteInfo
                pickup={booking.pickup_location}
                destination={booking.destination}
                note={booking.notes ? `Catatan customer: ${booking.notes}` : undefined}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Status perjalanan"
              subtitle="Perbarui status setiap kali berpindah tahap agar customer melihat progres."
            />
            <TripTimeline status={booking.status} />
          </Card>
        </div>

        <aside className="detail-side">
          <Card>
            <CardHeader title="Customer" />
            <div className="driver-panel">
              <div className="driver-panel__head">
                <Avatar name={customer?.name ?? 'Customer'} size="lg" />
                <div>
                  <p className="driver-panel__name">{customer?.name ?? 'Customer'}</p>
                  <p className="driver-panel__meta">{customer?.phone ?? '—'}</p>
                  <p className="driver-panel__rating">
                    <Icon name="user" size={13} />
                    Customer
                  </p>
                </div>
              </div>
              {customer?.phone ? (
                <a href={`tel:${customer.phone}`} className="btn btn--outline btn--block">
                  <Icon name="phone" size={17} />
                  <span>Hubungi customer</span>
                </a>
              ) : null}
            </div>
          </Card>

          {canShareLocation ? (
            <Card>
              <CardHeader
                title="Lokasi live"
                subtitle="Bagikan posisi driver ke customer dan admin selama perjalanan aktif."
              />
              <div className="notice notice--info">
                <Icon name="map-pin" size={18} />
                <p>
                  {socketConnected
                    ? 'Kanal realtime tersambung. Lokasi hanya dikirim ke customer pesanan ini dan admin.'
                    : 'Kanal realtime belum tersambung. Periksa koneksi lalu coba lagi.'}
                </p>
              </div>
              <Button
                block
                variant={sharingLocation ? 'success' : 'outline'}
                icon="map-pin"
                onClick={toggleLocationSharing}
              >
                {sharingLocation ? 'Hentikan berbagi lokasi' : 'Bagikan lokasi saya'}
              </Button>
              <p className="action-panel__hint">
                {locationNote ||
                  'Browser akan meminta izin lokasi. Aktifkan hanya saat perjalanan berlangsung.'}
              </p>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Aksi perjalanan" />
            {action ? (
              <div className="action-panel">
                <Button block icon="check" onClick={handleAdvance} disabled={busy}>
                  {busy ? 'Menyimpan...' : action.label}
                </Button>
                <p className="action-panel__hint">
                  Pastikan kondisi sudah sesuai sebelum memperbarui status.
                </p>
              </div>
            ) : booking.status === 'completed' ? (
              <div className="action-panel">
                <div className="notice notice--success">
                  <Icon name="check" size={18} />
                  <p>Perjalanan sudah selesai. Terima pembayaran tunai dari customer.</p>
                </div>
                {needsCash ? (
                  <Button block icon="wallet" onClick={handleCollectCash} disabled={busy}>
                    {busy ? 'Menyimpan...' : 'Konfirmasi tunai diterima'}
                  </Button>
                ) : (
                  <div className="notice notice--success">
                    <Icon name="check" size={18} />
                    <p>Pembayaran tunai sudah dikonfirmasi. Tidak ada aksi tambahan.</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="card__text">Tidak ada aksi untuk status pesanan ini.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Rincian pendapatan" />
            <dl className="summary-list">
              <div className="summary-row">
                <dt>Tarif perjalanan</dt>
                <dd>{formatCurrency(booking.estimated_fare)}</dd>
              </div>
              <div className="summary-row">
                <dt>Metode</dt>
                <dd>{booking.payment_method ? 'Tunai' : 'Belum dipilih'}</dd>
              </div>
              <div className="summary-row">
                <dt>Status</dt>
                <dd>
                  <PaymentBadge status={booking.payment_status} />
                </dd>
              </div>
              {booking.paid_at ? (
                <div className="summary-row">
                  <dt>Dibayar</dt>
                  <dd>{formatDateTime(booking.paid_at)}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          {booking.payment_status === 'paid' ? (
            <PaymentReceipt
              booking={booking}
              payment={booking.payment}
              title="Bukti pembayaran"
              description="Kuitansi ini tersimpan otomatis dan dapat dibuka kembali dari riwayat pesanan."
            />
          ) : null}
        </aside>
      </div>

      <Modal
        open={finishOpen}
        title="Selesaikan perjalanan?"
        description="Pastikan customer sudah tiba di lokasi tujuan sebelum menutup pesanan."
        onClose={() => setFinishOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setFinishOpen(false)} disabled={busy}>
              Belum
            </Button>
            <Button variant="success" onClick={handleFinish} disabled={busy}>
              {busy ? 'Menyimpan...' : 'Ya, selesaikan'}
            </Button>
          </>
        }
      >
        <div className="modal-summary">
          <p className="modal-summary__id">{booking.id}</p>
          <RouteInfo pickup={booking.pickup_location} destination={booking.destination} />
        </div>
      </Modal>
    </>
  )
}
