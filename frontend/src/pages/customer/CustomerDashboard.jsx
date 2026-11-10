import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../../components/ui/Avatar'
import BookingCard from '../../components/booking/BookingCard'
import MapPreview from '../../components/booking/MapPreview'
import TripTimeline from '../../components/booking/TripTimeline'
import StatCard, { Card, CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { ACTIVE_STATUSES, VEHICLE_LABEL } from '../../lib/constants'
import { estimateDurationMinutes } from '../../lib/fare'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/format'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const { bookings, loading, error, refresh } = useData()

  const mine = useMemo(
    () => bookings.filter((booking) => booking.customer_id === user.id),
    [bookings, user.id],
  )

  const sorted = useMemo(
    () =>
      [...mine].sort(
        (first, second) => new Date(second.created_at) - new Date(first.created_at),
      ),
    [mine],
  )

  const activeTrip = sorted.find((booking) => ACTIVE_STATUSES.includes(booking.status))
  const completed = mine.filter((booking) => booking.status === 'completed')
  const paidTotal = completed
    .filter((booking) => booking.payment_status === 'paid')
    .reduce((total, booking) => total + booking.estimated_fare, 0)
  const unpaidTrip = completed.find((booking) => booking.payment_status !== 'paid')
  const activeCount = mine.filter((booking) => ACTIVE_STATUSES.includes(booking.status)).length
  const recent = sorted.filter((booking) => booking.id !== activeTrip?.id).slice(0, 3)

  const driver = activeTrip?.driver ?? null

  if (loading && mine.length === 0) {
    return <PageLoader label="Memuat dashboard..." />
  }

  return (
    <>
      <PageHeader
        eyebrow={formatDate(new Date())}
        title={`Halo, ${user.name.split(' ')[0]} 👋`}
        description="Ringkasan perjalanan dan pesanan kamu hari ini."
        actions={
          <>
            <Button to="/app/history" variant="outline" icon="history">
              Riwayat
            </Button>
            <Button to="/app/bookings/new" icon="plus">
              Buat Pesanan
            </Button>
          </>
        }
      />

      {error ? (
        <div className="alert alert--danger alert--banner" role="alert">
          <Icon name="alert" size={18} />
          <div className="alert__body">
            <p>{error}</p>
          </div>
          <Button size="sm" variant="outline" icon="refresh" onClick={() => refresh()}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      <div className="stats-grid">
        <StatCard
          icon="route"
          label="Perjalanan aktif"
          value={activeCount}
          hint={activeTrip ? `${activeTrip.id} sedang diproses` : 'Tidak ada perjalanan aktif'}
          tone="blue"
        />
        <StatCard
          icon="check"
          label="Perjalanan selesai"
          value={completed.length}
          hint="Tersimpan di database"
          tone="green"
        />
        <StatCard
          icon="wallet"
          label="Total pengeluaran"
          value={formatCurrency(paidTotal)}
          hint="Dari transaksi berstatus lunas"
          tone="amber"
        />
        <StatCard
          icon="clock"
          label="Menunggu pembayaran"
          value={unpaidTrip ? formatCurrency(unpaidTrip.estimated_fare) : '—'}
          hint={unpaidTrip ? `${unpaidTrip.id} belum dibayar` : 'Semua transaksi beres'}
          tone="navy"
        />
      </div>

      {unpaidTrip ? (
        <div className="alert alert--warning alert--banner">
          <Icon name="wallet" size={18} />
          <div className="alert__body">
            <p>
              Perjalanan <strong>{unpaidTrip.id}</strong> selesai tetapi belum dibayar.
              Selesaikan pembayaran agar riwayat tercatat lunas.
            </p>
          </div>
          <Button
            to={`/app/bookings/${unpaidTrip.id}/payment`}
            size="sm"
            variant="primary"
            trailingIcon="arrow-right"
          >
            Bayar sekarang
          </Button>
        </div>
      ) : null}

      <div className="dash-grid">
        <div className="dash-main">
          {activeTrip ? (
            <Card className="trip-card">
              <div className="trip-card__head">
                <div>
                  <p className="trip-card__eyebrow">Perjalanan aktif · {activeTrip.id}</p>
                  <h2 className="trip-card__title">
                    {activeTrip.pickup_location} → {activeTrip.destination}
                  </h2>
                  <p className="trip-card__meta">
                    <Icon name="calendar" size={15} />
                    {formatDateTime(activeTrip.scheduled_at)}
                  </p>
                </div>
                <StatusBadge status={activeTrip.status} />
              </div>

              <div className="trip-card__grid">
                <MapPreview
                  pickup={{
                    label: activeTrip.pickup_location.split(',')[0],
                    address: activeTrip.pickup_location,
                    coords: activeTrip.pickup_coords,
                  }}
                  destination={{
                    label: activeTrip.destination.split(',')[0],
                    address: activeTrip.destination,
                    coords: activeTrip.destination_coords,
                  }}
                  distanceKm={activeTrip.distance_km}
                  durationMinutes={
                    activeTrip.route_duration_minutes ??
                    estimateDurationMinutes(activeTrip.distance_km)
                  }
                  routeGeometry={activeTrip.route_geometry}
                />

                <div className="trip-card__aside">
                  {driver ? (
                    <div className="driver-row">
                      <Avatar name={driver.name} size="md" />
                      <div className="driver-row__text">
                        <p className="driver-row__name">{driver.name}</p>
                        <p className="driver-row__meta">
                          {VEHICLE_LABEL[driver.vehicle?.type] ?? 'Kendaraan'} ·{' '}
                          {driver.vehicle?.plate}
                        </p>
                      </div>
                      <span className="driver-row__rating">
                        <Icon name="star" size={13} />
                        {driver.vehicle?.rating ?? '—'}
                      </span>
                    </div>
                  ) : (
                    <div className="driver-row driver-row--searching">
                      <span className="driver-row__pulse" aria-hidden="true" />
                      <div className="driver-row__text">
                        <p className="driver-row__name">Mencari driver</p>
                        <p className="driver-row__meta">Pesanan menunggu diterima driver</p>
                      </div>
                    </div>
                  )}

                  <dl className="summary-list">
                    <div className="summary-row">
                      <dt>Estimasi tarif</dt>
                      <dd>{formatCurrency(activeTrip.estimated_fare)}</dd>
                    </div>
                    <div className="summary-row">
                      <dt>Kendaraan</dt>
                      <dd>{VEHICLE_LABEL[activeTrip.vehicle_type] ?? activeTrip.vehicle_type}</dd>
                    </div>
                    <div className="summary-row">
                      <dt>Jarak estimasi</dt>
                      <dd>{activeTrip.distance_km} km</dd>
                    </div>
                  </dl>

                  <Button
                    to={`/app/bookings/${activeTrip.id}`}
                    block
                    trailingIcon="arrow-right"
                  >
                    Lihat detail
                  </Button>
                </div>
              </div>

              <div className="trip-card__timeline">
                <TripTimeline status={activeTrip.status} compact />
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon="navigation"
                title="Belum ada perjalanan aktif"
                description="Buat pesanan baru untuk memulai. Titik penjemputan dan tujuan bisa kamu pilih langsung dari daftar lokasi."
              >
                <Button to="/app/bookings/new" icon="plus">
                  Buat pesanan
                </Button>
              </EmptyState>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Pesanan terbaru"
              subtitle="Tiga aktivitas terakhir pada akunmu."
              action={
                <Link to="/app/history" className="link-inline">
                  Lihat semua
                  <Icon name="chevron-right" size={15} />
                </Link>
              }
            />
            {recent.length > 0 ? (
              <div className="booking-list">
                {recent.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    driverName={booking.driver?.name}
                    to={`/app/bookings/${booking.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="receipt"
                title="Belum ada riwayat"
                description="Pesanan yang sudah kamu buat akan muncul di sini."
              />
            )}
          </Card>
        </div>

        <aside className="dash-side">
          <Card>
            <CardHeader title="Aksi cepat" />
            <div className="quick-actions">
              <Link to="/app/bookings/new" className="quick-action">
                <span className="quick-action__icon quick-action__icon--blue">
                  <Icon name="plus" size={18} />
                </span>
                <span>
                  <strong>Buat pesanan</strong>
                  <small>Pilih jemput dan tujuan</small>
                </span>
                <Icon name="chevron-right" size={16} />
              </Link>
              <Link to="/app/history" className="quick-action">
                <span className="quick-action__icon quick-action__icon--amber">
                  <Icon name="history" size={18} />
                </span>
                <span>
                  <strong>Riwayat perjalanan</strong>
                  <small>Tinjau pesanan terdahulu</small>
                </span>
                <Icon name="chevron-right" size={16} />
              </Link>
              <Link to="/app/profile" className="quick-action">
                <span className="quick-action__icon quick-action__icon--green">
                  <Icon name="user" size={18} />
                </span>
                <span>
                  <strong>Profil akun</strong>
                  <small>Perbarui data pribadi</small>
                </span>
                <Icon name="chevron-right" size={16} />
              </Link>
            </div>
          </Card>

          <Card className="card--tint">
            <CardHeader title="Tips perjalanan" />
            <p className="card__text">
              Pastikan titik jemput, tujuan, dan jadwal sudah benar sebelum mengonfirmasi
              pesanan. Pantau status perjalanan dari halaman detail.
            </p>
            <ul className="check-list">
              <li>
                <Icon name="check" size={14} />
                Periksa alamat dan jadwal
              </li>
              <li>
                <Icon name="check" size={14} />
                Simpan nomor telepon yang aktif
              </li>
              <li>
                <Icon name="check" size={14} />
                Cek status sebelum berangkat
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  )
}
