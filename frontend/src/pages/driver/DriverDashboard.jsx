import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Avatar from '../../components/ui/Avatar'
import RouteInfo from '../../components/booking/RouteInfo'
import TripTimeline from '../../components/booking/TripTimeline'
import { StatusBadge, VerificationBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import StatCard, { Card, CardHeader } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import Switch from '../../components/ui/Switch'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { ACTIVE_STATUSES, VEHICLE_LABEL } from '../../lib/constants'
import { formatCurrency, formatDate, formatDateTime, isSameDay } from '../../lib/format'

export default function DriverDashboard() {
  const { user } = useAuth()
  const { bookings, loading, setAvailability, acceptBooking, declineBooking } = useData()
  const { push } = useToast()
  const navigate = useNavigate()

  const [acceptingId, setAcceptingId] = useState(null)
  const [decliningId, setDecliningId] = useState(null)
  const [savingAvailability, setSavingAvailability] = useState(false)

  const me = user
  const vehicle = me.vehicle ?? {}
  const isOnline = vehicle.availability_status === 'online'
  const isApproved = vehicle.verification_status === 'approved'

  const myJobs = useMemo(
    () => bookings.filter((booking) => booking.driver_id === me.id),
    [bookings, me.id],
  )
  const activeJob = myJobs.find((booking) => ACTIVE_STATUSES.includes(booking.status))
  const completed = myJobs.filter((booking) => booking.status === 'completed')
  const paidJobs = completed.filter((booking) => booking.payment_status === 'paid')
  const earnings = paidJobs.reduce((total, booking) => total + booking.estimated_fare, 0)
  const todayEarnings = paidJobs
    .filter((booking) => booking.paid_at && isSameDay(booking.paid_at, new Date()))
    .reduce((total, booking) => total + booking.estimated_fare, 0)

  const incoming = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === 'pending' &&
          !booking.driver_id &&
          booking.vehicle_type === vehicle.type,
      ),
    [bookings, vehicle.type],
  )

  const handleAvailability = async (checked) => {
    if (!isApproved) {
      push({
        title: 'Akun belum terverifikasi',
        message: 'Tunggu persetujuan admin sebelum mengaktifkan status online.',
        variant: 'error',
      })
      return
    }

    setSavingAvailability(true)
    try {
      await setAvailability(checked ? 'online' : 'offline')
      push({
        title: checked ? 'Kamu sekarang online' : 'Kamu sekarang offline',
        message: checked
          ? 'Pesanan baru akan muncul pada daftar pesanan masuk.'
          : 'Kamu tidak akan menerima pesanan baru sampai online kembali.',
        variant: 'info',
      })
    } catch (error) {
      push({ variant: 'error', title: 'Gagal mengubah status', message: error.message })
    } finally {
      setSavingAvailability(false)
    }
  }

  const handleAccept = async (booking) => {
    if (!isOnline) {
      push({
        title: 'Status masih offline',
        message: 'Aktifkan status online untuk menerima pesanan.',
        variant: 'error',
      })
      return
    }

    setAcceptingId(booking.id)
    try {
      await acceptBooking(booking.id)
      push({
        title: 'Pesanan diterima',
        message: `Kamu ditugaskan untuk ${booking.id}.`,
      })
      navigate(`/driver/orders/${booking.id}`)
    } catch (error) {
      push({
        variant: 'error',
        title: 'Pesanan gagal diterima',
        message: error.message,
      })
    } finally {
      setAcceptingId(null)
    }
  }

  const handleDecline = async (booking) => {
    setDecliningId(booking.id)
    try {
      await declineBooking(booking.id)
      push({
        title: 'Pesanan dilewati',
        message: `${booking.id} disembunyikan dari daftar pesananmu.`,
        variant: 'info',
      })
    } catch (error) {
      push({
        variant: 'error',
        title: 'Pesanan gagal dilewati',
        message: error.message,
      })
    } finally {
      setDecliningId(null)
    }
  }

  if (loading && bookings.length === 0) {
    return <PageLoader label="Memuat dashboard driver..." />
  }

  return (
    <>
      <PageHeader
        eyebrow={formatDate(new Date())}
        title={`Halo, ${me.name.split(' ')[0]} 👋`}
        description="Atur ketersediaan dan kelola pesanan yang masuk."
        actions={
          <>
            <Button to="/driver/history" variant="outline" icon="history">
              Riwayat pesanan
            </Button>
            <Button to="/driver/profile" variant="outline" icon="user">
              Profil driver
            </Button>
          </>
        }
      />

      {!isApproved ? (
        <div className="alert alert--warning alert--banner">
          <Icon name="shield" size={18} />
          <div className="alert__body">
            <p>
              Akun driver belum terverifikasi. Status saat ini:{' '}
              <strong>{vehicle.verification_status ?? 'pending'}</strong>. Hubungi admin melalui
              dashboard admin untuk persetujuan.
            </p>
          </div>
        </div>
      ) : null}

      <div className="availability-card">
        <div className="availability-card__main">
          <span
            className={['availability-card__dot', isOnline ? 'is-online' : '']
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          />
          <div>
            <p className="availability-card__title">
              {isOnline ? 'Kamu sedang online' : 'Kamu sedang offline'}
            </p>
            <p className="availability-card__desc">
              {isOnline
                ? 'Pesanan baru dapat kamu terima dari daftar pesanan masuk.'
                : 'Aktifkan status online agar pesanan baru muncul dan dapat diterima.'}
            </p>
          </div>
        </div>
        <Switch
          checked={isOnline}
          onChange={handleAvailability}
          label="Ketersediaan"
          description={
            savingAvailability ? 'Menyimpan...' : isOnline ? 'Menerima pesanan' : 'Berhenti menerima'
          }
          disabled={!isApproved || savingAvailability}
        />
      </div>

      <div className="stats-grid">
        <StatCard
          icon="check"
          label="Pesanan selesai"
          value={completed.length}
          hint="Tersimpan di database"
          tone="green"
        />
        <StatCard
          icon="wallet"
          label="Pendapatan lunas"
          value={formatCurrency(earnings)}
          hint={`Hari ini ${formatCurrency(todayEarnings)}`}
          tone="amber"
        />
        <StatCard
          icon="star"
          label="Rating driver"
          value={vehicle.rating || '—'}
          hint={`${vehicle.total_trips ?? 0} perjalanan`}
          tone="blue"
        />
        <StatCard
          icon="bell"
          label="Pesanan masuk"
          value={incoming.length}
          hint={isOnline ? 'Siap dipertimbangkan' : 'Aktifkan status online'}
          tone="navy"
        />
      </div>

      <div className="dash-grid">
        <div className="dash-main">
          {activeJob ? (
            <Card>
              <div className="trip-card__head">
                <div>
                  <p className="trip-card__eyebrow">Perjalanan aktif · {activeJob.id}</p>
                  <h2 className="trip-card__title">
                    {activeJob.pickup_location} → {activeJob.destination}
                  </h2>
                  <p className="trip-card__meta">
                    <Icon name="calendar" size={15} />
                    {formatDateTime(activeJob.scheduled_at)}
                  </p>
                </div>
                <StatusBadge status={activeJob.status} />
              </div>

              <RouteInfo
                pickup={activeJob.pickup_location}
                destination={activeJob.destination}
                note={activeJob.notes || undefined}
              />

              <div className="active-job__footer">
                <div className="active-job__meta">
                  <span>
                    <Icon name="map-pin" size={15} />
                    {activeJob.distance_km} km
                  </span>
                  <span>
                    <Icon name="wallet" size={15} />
                    {formatCurrency(activeJob.estimated_fare)}
                  </span>
                  <span>
                    <Icon name="bike" size={15} />
                    {VEHICLE_LABEL[activeJob.vehicle_type] ?? activeJob.vehicle_type}
                  </span>
                </div>
                <Button to={`/driver/orders/${activeJob.id}`} trailingIcon="arrow-right">
                  Buka pesanan
                </Button>
              </div>

              <TripTimeline status={activeJob.status} compact />
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon="route"
                title="Belum ada perjalanan aktif"
                description="Terima salah satu pesanan masuk untuk mulai menjalankan perjalanan."
              />
            </Card>
          )}

          <Card>
            <CardHeader
              title="Pesanan masuk"
              subtitle="Pesanan menunggu driver. Pesanan yang diambil driver lain otomatis tidak berlaku."
              action={<span className="badge badge--pending">{incoming.length} baru</span>}
            />
            {incoming.length > 0 ? (
              <div className="request-list">
                {incoming.map((booking) => (
                  <article className="request-card" key={booking.id}>
                    <div className="request-card__head">
                      <span className="request-card__id">{booking.id}</span>
                      <span className="request-card__time">
                        <Icon name="clock" size={14} />
                        {formatDateTime(booking.scheduled_at)}
                      </span>
                    </div>

                    <RouteInfo
                      pickup={booking.pickup_location}
                      destination={booking.destination}
                    />

                    <div className="request-card__meta">
                      <span>
                        <Icon name="map-pin" size={14} />
                        {booking.distance_km} km
                      </span>
                      <span>
                        <Icon name="wallet" size={14} />
                        {formatCurrency(booking.estimated_fare)}
                      </span>
                      <span>
                        <Icon name="user" size={14} />
                        {booking.customer?.name ?? 'Customer'}
                      </span>
                    </div>

                    <div className="request-card__actions">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDecline(booking)}
                        disabled={acceptingId === booking.id || decliningId === booking.id}
                      >
                        {decliningId === booking.id ? 'Melewati...' : 'Lewati'}
                      </Button>
                      <Button
                        size="sm"
                        icon="check"
                        onClick={() => handleAccept(booking)}
                        disabled={!isOnline || acceptingId === booking.id}
                      >
                        {acceptingId === booking.id ? 'Menerima...' : 'Terima pesanan'}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="bell"
                title="Belum ada pesanan baru"
                description="Pastikan status online aktif. Pesanan dari customer akan muncul di sini."
              />
            )}
          </Card>
        </div>

        <aside className="dash-side">
          <Card>
            <CardHeader title="Akun driver" />
            <div className="driver-summary">
              <Avatar name={me.name} size="md" />
              <div>
                <p className="driver-summary__name">{me.name}</p>
                <p className="driver-summary__meta">
                  {VEHICLE_LABEL[vehicle.type] ?? 'Kendaraan'} · {vehicle.plate ?? '—'}
                </p>
              </div>
            </div>
            <dl className="summary-list">
              <div className="summary-row">
                <dt>Verifikasi</dt>
                <dd>
                  <VerificationBadge status={vehicle.verification_status ?? 'pending'} />
                </dd>
              </div>
              <div className="summary-row">
                <dt>Total perjalanan</dt>
                <dd>{vehicle.total_trips ?? 0}</dd>
              </div>
              <div className="summary-row">
                <dt>Rating</dt>
                <dd>{vehicle.rating || '—'}</dd>
              </div>
            </dl>
            <Link to="/driver/profile" className="link-inline">
              Kelola profil
              <Icon name="chevron-right" size={15} />
            </Link>
          </Card>
        </aside>
      </div>
    </>
  )
}
