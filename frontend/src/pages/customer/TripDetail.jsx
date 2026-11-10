import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '../../components/ui/Avatar'
import MapPreview from '../../components/booking/MapPreview'
import RouteInfo from '../../components/booking/RouteInfo'
import TripTimeline from '../../components/booking/TripTimeline'
import { PaymentBadge, StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { TextAreaField } from '../../components/ui/Field'
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

const CANCELLABLE = ['pending', 'accepted', 'arrived']

export default function TripDetail() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    bookings,
    loading,
    cancelBooking,
    deleteBooking,
    driverLocations,
    rateBooking,
  } = useData()
  const { push } = useToast()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [ratingSaving, setRatingSaving] = useState(false)

  const booking = bookings.find((candidate) => candidate.id === bookingId)

  if (loading && !booking) {
    return <PageLoader label="Memuat detail perjalanan..." />
  }

  if (!booking || booking.customer_id !== user.id) {
    return (
      <Card>
        <EmptyState
          icon="alert"
          title="Pesanan tidak ditemukan"
          description="Pesanan ini tidak tersedia pada akunmu atau sudah tidak ada."
        >
          <Button to="/app" icon="arrow-left">
            Kembali ke dashboard
          </Button>
        </EmptyState>
      </Card>
    )
  }

  const driver = booking.driver
  const driverLocation = driverLocations[booking.id] ?? booking.driver_location
  const driverPoint = driverLocation
    ? {
        label: 'Posisi driver',
        coords: { lat: driverLocation.lat, lng: driverLocation.lng },
      }
    : null
  const canCancel = CANCELLABLE.includes(booking.status)
  const canDelete = booking.status === 'cancelled'
  const needsPayment = booking.status === 'completed' && booking.payment_status !== 'paid'
  const canEdit = booking.status === 'pending' && !booking.driver_id
  const canRate = booking.status === 'completed' && Boolean(booking.driver_id)

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await cancelBooking(booking.id)
      setCancelOpen(false)
      push({
        title: 'Pesanan dibatalkan',
        message: `${booking.id} tidak akan diproses lebih lanjut.`,
        variant: 'info',
      })
    } catch (error) {
      push({ variant: 'error', title: 'Gagal membatalkan', message: error.message })
    } finally {
      setCancelling(false)
    }
  }

  const handleRate = async () => {
    if (!rating) {
      push({
        variant: 'error',
        title: 'Rating belum dipilih',
        message: 'Pilih 1 sampai 5 bintang sebelum mengirim.',
      })
      return
    }

    setRatingSaving(true)
    try {
      await rateBooking(booking.id, { rating, comment: ratingComment.trim() })
      push({
        title: 'Rating terkirim',
        message: 'Terima kasih, penilaianmu membantu driver lain.',
      })
    } catch (error) {
      push({ variant: 'error', title: 'Gagal mengirim rating', message: error.message })
    } finally {
      setRatingSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteBooking(booking.id)
      setDeleteOpen(false)
      push({
        title: 'Pesanan dihapus permanen',
        message: `${booking.id} sudah tidak tersimpan di database.`,
        variant: 'info',
      })
      navigate('/app/history')
    } catch (error) {
      push({ variant: 'error', title: 'Gagal menghapus', message: error.message })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`Pesanan ${booking.id}`}
        title="Detail perjalanan"
        description={`Dibuat ${formatDateTime(booking.created_at)} · ${VEHICLE_LABEL[booking.vehicle_type] ?? booking.vehicle_type}`}
        actions={
          <>
            <Button to="/app" variant="outline" icon="arrow-left">
              Dashboard
            </Button>
            {canEdit ? (
              <Button to={`/app/bookings/${booking.id}/edit`} icon="refresh">
                Ubah pesanan
              </Button>
            ) : null}
            {needsPayment ? (
              <Button to={`/app/bookings/${booking.id}/payment`} icon="wallet">
                Bayar sekarang
              </Button>
            ) : null}
          </>
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
                    {booking.status === 'completed' ? (
                      <PaymentBadge status={booking.payment_status} />
                    ) : null}
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
                  <small>Estimasi tarif</small>
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
                driverPoint={driverPoint}
              />

              <RouteInfo
                pickup={booking.pickup_location}
                destination={booking.destination}
                note={
                  booking.notes
                    ? `Catatan: ${booking.notes}`
                    : 'Tidak ada catatan tambahan untuk driver.'
                }
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Status perjalanan"
              subtitle="Status diperbarui otomatis melalui koneksi realtime ketika driver mengubahnya."
            />
            <TripTimeline status={booking.status} />
          </Card>
        </div>

        <aside className="detail-side">
          <Card>
            <CardHeader title="Driver" />
            {driver ? (
              <div className="driver-panel">
                <div className="driver-panel__head">
                  <Avatar name={driver.name} size="lg" />
                  <div>
                    <p className="driver-panel__name">{driver.name}</p>
                    <p className="driver-panel__meta">
                      {VEHICLE_LABEL[driver.vehicle?.type] ?? 'Kendaraan'} ·{' '}
                      {driver.vehicle?.plate ?? '—'}
                    </p>
                    <p className="driver-panel__rating">
                      <Icon name="star" size={13} />
                      {driver.vehicle?.rating ?? '—'} · {driver.vehicle?.total_trips ?? 0}{' '}
                      perjalanan
                    </p>
                  </div>
                </div>
                <a href={`tel:${driver.phone}`} className="btn btn--outline btn--block">
                  <Icon name="phone" size={17} />
                  <span>Hubungi driver</span>
                </a>
              </div>
            ) : (
              <div className="driver-panel driver-panel--empty">
                <span className="driver-row__pulse" aria-hidden="true" />
                <p className="driver-panel__name">Menunggu driver</p>
                <p className="driver-panel__meta">
                  Pesanan sudah masuk ke antrean driver yang tersedia.
                </p>
              </div>
            )}
          </Card>

          {driverLocation ? (
            <Card>
              <CardHeader
                title="Posisi driver"
                subtitle="Koordinat terakhir yang dibagikan selama perjalanan aktif."
              />
              <dl className="summary-list">
                <div className="summary-row">
                  <dt>Lintang</dt>
                  <dd>{Number(driverLocation.lat).toFixed(5)}</dd>
                </div>
                <div className="summary-row">
                  <dt>Bujur</dt>
                  <dd>{Number(driverLocation.lng).toFixed(5)}</dd>
                </div>
                <div className="summary-row">
                  <dt>Diperbarui</dt>
                  <dd>{formatDateTime(driverLocation.updated_at)}</dd>
                </div>
              </dl>
              <div className="notice notice--info">
                <Icon name="map-pin" size={18} />
                <p>Data lokasi diterima realtime dan hanya dapat dilihat pihak terkait.</p>
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Rincian pembayaran" />
            <dl className="summary-list">
              <div className="summary-row">
                <dt>Estimasi tarif</dt>
                <dd>{formatCurrency(booking.estimated_fare)}</dd>
              </div>
              <div className="summary-row">
                <dt>Metode</dt>
                <dd>{booking.payment_method ? 'Tunai' : 'Belum dipilih'}</dd>
              </div>
              <div className="summary-row">
                <dt>Status pembayaran</dt>
                <dd>
                  <PaymentBadge status={booking.payment_status} />
                </dd>
              </div>
              {booking.paid_at ? (
                <div className="summary-row">
                  <dt>Dibayar pada</dt>
                  <dd>{formatDateTime(booking.paid_at)}</dd>
                </div>
              ) : null}
            </dl>
            {needsPayment ? (
              <Button to={`/app/bookings/${booking.id}/payment`} block icon="wallet">
                Pilih metode pembayaran
              </Button>
            ) : null}
          </Card>

          {canRate ? (
            <Card>
              <CardHeader
                title={booking.rating ? 'Rating perjalanan' : 'Beri rating driver'}
                subtitle={
                  booking.rating
                    ? 'Rating yang kamu kirim membantu kualitas layanan.'
                    : 'Bagaimana pengalaman perjalananmu?'
                }
              />
              {booking.rating ? (
                <div className="rating-summary">
                  <div className="rating-summary__stars" aria-label={`${booking.rating} dari 5`}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Icon
                        key={value}
                        name="star"
                        size={20}
                        className={value <= booking.rating ? 'is-filled' : ''}
                      />
                    ))}
                  </div>
                  {booking.rating_comment ? (
                    <p className="rating-summary__comment">“{booking.rating_comment}”</p>
                  ) : null}
                  <p className="field__hint">
                    Dikirim {formatDateTime(booking.rated_at)}
                  </p>
                </div>
              ) : (
                <div className="rating-form">
                  <div className="rating-stars" role="group" aria-label="Pilih rating">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={['rating-star', value <= rating ? 'is-active' : '']
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => setRating(value)}
                        aria-label={`${value} bintang`}
                        aria-pressed={rating === value}
                      >
                        <Icon name="star" size={26} />
                      </button>
                    ))}
                  </div>
                  <TextAreaField
                    id="rating-comment"
                    label="Komentar (opsional)"
                    value={ratingComment}
                    onChange={(event) => setRatingComment(event.target.value)}
                    maxLength={500}
                    hint={`${ratingComment.length}/500 karakter`}
                    rows={3}
                    placeholder="Ceritakan pengalaman perjalananmu..."
                  />
                  <Button block onClick={handleRate} disabled={ratingSaving}>
                    {ratingSaving ? 'Mengirim...' : 'Kirim rating'}
                  </Button>
                </div>
              )}
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Informasi pesanan" />
            <dl className="summary-list">
              <div className="summary-row">
                <dt>ID pesanan</dt>
                <dd>{booking.id}</dd>
              </div>
              <div className="summary-row">
                <dt>Jarak estimasi</dt>
                <dd>{booking.distance_km} km</dd>
              </div>
              <div className="summary-row">
                <dt>Kendaraan</dt>
                <dd>{VEHICLE_LABEL[booking.vehicle_type] ?? booking.vehicle_type}</dd>
              </div>
              <div className="summary-row">
                <dt>Dibuat</dt>
                <dd>{formatDateTime(booking.created_at)}</dd>
              </div>
              {booking.notes ? (
                <div className="summary-row summary-row--stacked">
                  <dt>Catatan</dt>
                  <dd>{booking.notes}</dd>
                </div>
              ) : null}
            </dl>
            {canCancel ? (
              <Button variant="danger" block onClick={() => setCancelOpen(true)}>
                Batalkan pesanan
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="danger"
                block
                icon="trash"
                onClick={() => setDeleteOpen(true)}
              >
                Hapus permanen
              </Button>
            ) : null}
          </Card>
        </aside>
      </div>

      <Modal
        open={cancelOpen}
        title="Batalkan pesanan?"
        description="Pesanan yang dibatalkan tidak dapat dikembalikan. Kamu dapat membuat pesanan baru kapan saja."
        onClose={() => setCancelOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Kembali
            </Button>
            <Button variant="danger" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Membatalkan...' : 'Ya, batalkan'}
            </Button>
          </>
        }
      >
        <div className="modal-summary">
          <p className="modal-summary__id">{booking.id}</p>
          <RouteInfo pickup={booking.pickup_location} destination={booking.destination} />
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Hapus pesanan permanen?"
        description="Data pesanan dan pembayaran terkait akan dihapus dari database. Tindakan ini tidak dapat dibatalkan."
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting} icon="trash">
              {deleting ? 'Menghapus...' : 'Ya, hapus permanen'}
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

