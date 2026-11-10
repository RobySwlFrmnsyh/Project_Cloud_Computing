import { useMemo, useState } from 'react'
import Avatar from '../../components/ui/Avatar'
import {
  AvailabilityBadge,
  Badge,
  PaymentBadge,
  StatusBadge,
  VerificationBadge,
} from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import StatCard, { Card } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import { useToast } from '../../components/ui/Toast'
import { useData } from '../../context/DataContext'
import { ACTIVE_STATUSES, BOOKING_STATUS, ROLE_LABEL, VEHICLE_LABEL } from '../../lib/constants'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/format'

const TABS = [
  { id: 'users', label: 'Pengguna' },
  { id: 'drivers', label: 'Driver' },
  { id: 'bookings', label: 'Pesanan' },
]

const CANCELLABLE = ['pending', 'accepted', 'arrived']

const STATUS_FILTERS = [
  { id: 'all', label: 'Semua' },
  ...Object.entries(BOOKING_STATUS).map(([id, meta]) => ({ id, label: meta.label })),
]

export default function AdminDashboard() {
  const {
    users,
    bookings,
    loading,
    verifyDriver,
    cancelBooking,
    deleteBooking,
    resetUserData,
    resetUserPassword,
    deleteUser,
  } = useData()
  const { push } = useToast()

  const [tab, setTab] = useState('users')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [verifyingId, setVerifyingId] = useState(null)
  const [actionBooking, setActionBooking] = useState(null)
  const [actionKind, setActionKind] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [accountTarget, setAccountTarget] = useState(null)
  const [accountKind, setAccountKind] = useState(null)
  const [accountBusy, setAccountBusy] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState(null)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordResult, setPasswordResult] = useState(null)

  const drivers = useMemo(
    () => users.filter((user) => user.role === 'driver'),
    [users],
  )
  const pendingDrivers = drivers.filter(
    (driver) => driver.vehicle?.verification_status === 'pending',
  )
  const activeBookings = bookings.filter((booking) =>
    ACTIVE_STATUSES.includes(booking.status),
  )
  const revenue = bookings
    .filter((booking) => booking.payment_status === 'paid')
    .reduce((total, booking) => total + booking.estimated_fare, 0)

  const normalized = query.trim().toLowerCase()

  const filteredUsers = users.filter((user) =>
    [user.name, user.email, user.phone].some((value) =>
      value.toLowerCase().includes(normalized),
    ),
  )

  const filteredDrivers = drivers.filter((driver) =>
    [driver.name, driver.email, driver.vehicle?.plate ?? ''].some((value) =>
      value.toLowerCase().includes(normalized),
    ),
  )

  const filteredBookings = bookings
    .filter((booking) => {
      if (statusFilter !== 'all' && booking.status !== statusFilter) return false
      if (!normalized) return true

      return [
        booking.id,
        booking.pickup_location,
        booking.destination,
        booking.customer?.name ?? '',
        booking.driver?.name ?? '',
      ].some((value) => value.toLowerCase().includes(normalized))
    })
    .sort((first, second) => new Date(second.scheduled_at) - new Date(first.scheduled_at))

  const handleBookingAction = async () => {
    if (!actionBooking || !actionKind) return

    setActionBusy(true)
    try {
      if (actionKind === 'cancel') {
        await cancelBooking(actionBooking.id)
        push({
          title: 'Pesanan dibatalkan',
          message: `${actionBooking.id} dibatalkan oleh admin.`,
          variant: 'info',
        })
      } else {
        await deleteBooking(actionBooking.id)
        push({
          title: 'Pesanan dihapus permanen',
          message: `${actionBooking.id} sudah tidak tersimpan di database.`,
          variant: 'info',
        })
      }
      setActionBooking(null)
      setActionKind(null)
    } catch (error) {
      push({
        variant: 'error',
        title: actionKind === 'cancel' ? 'Gagal membatalkan' : 'Gagal menghapus',
        message: error.message,
      })
    } finally {
      setActionBusy(false)
    }
  }

  const openBookingAction = (booking, kind) => {
    setActionBooking(booking)
    setActionKind(kind)
  }

  const closeAccountAction = () => {
    if (accountBusy) return
    setAccountTarget(null)
    setAccountKind(null)
  }

  const openAccountAction = (user, kind) => {
    setAccountTarget(user)
    setAccountKind(kind)
  }

  const openPasswordAction = (user) => {
    setPasswordTarget(user)
    setPasswordResult(null)
  }

  const closePasswordAction = () => {
    if (passwordBusy) return
    setPasswordTarget(null)
    setPasswordResult(null)
  }

  const handleResetPassword = async () => {
    if (!passwordTarget) return

    setPasswordBusy(true)
    try {
      const data = await resetUserPassword(passwordTarget.id)
      setPasswordResult(data)
      push({
        title: 'Sandi sementara dibuat',
        message: `Sampaikan sandi ini ke ${passwordTarget.name} secara aman.`,
        variant: 'info',
      })
    } catch (error) {
      push({
        variant: 'error',
        title: 'Reset sandi gagal',
        message: error.message,
      })
    } finally {
      setPasswordBusy(false)
    }
  }

  const copyTemporaryPassword = async () => {
    if (!passwordResult?.temporary_password) return

    try {
      await navigator.clipboard.writeText(passwordResult.temporary_password)
      push({
        title: 'Sandi disalin',
        message: 'Tempelkan hanya di kanal komunikasi yang aman.',
        variant: 'success',
      })
    } catch {
      push({
        variant: 'error',
        title: 'Gagal menyalin',
        message: 'Salin sandi sementara secara manual.',
      })
    }
  }

  const handleAccountAction = async () => {
    if (!accountTarget || !accountKind) return

    setAccountBusy(true)
    try {
      if (accountKind === 'reset') {
        const data = await resetUserData(accountTarget.id)
        push({
          title: 'Data akun direset',
          message:
            accountTarget.role === 'customer'
              ? `${accountTarget.name}: ${data.bookings_deleted} pesanan dan ${data.notifications_deleted} notifikasi dihapus.`
              : `${accountTarget.name}: ${data.bookings_released} riwayat pesanan dilepas dan profil driver direset.`,
          variant: 'info',
        })
      } else {
        await deleteUser(accountTarget.id)
        push({
          title: 'Akun dihapus permanen',
          message: `${accountTarget.name} (${ROLE_LABEL[accountTarget.role]}) sudah dihapus.`,
          variant: 'info',
        })
      }
      setAccountTarget(null)
      setAccountKind(null)
    } catch (error) {
      push({
        variant: 'error',
        title: accountKind === 'reset' ? 'Reset akun gagal' : 'Hapus akun gagal',
        message: error.message,
      })
    } finally {
      setAccountBusy(false)
    }
  }

  const accountIsDriver = accountTarget?.role === 'driver'

  const handleVerify = async (driver, status) => {
    setVerifyingId(driver.id)
    try {
      await verifyDriver(driver.id, status)
      push({
        title: status === 'approved' ? 'Driver disetujui' : 'Verifikasi ditolak',
        message:
          status === 'approved'
            ? `${driver.name} kini dapat masuk dan menerima pesanan.`
            : `${driver.name} tidak dapat masuk sampai verifikasi diperbaiki.`,
        variant: status === 'approved' ? 'success' : 'info',
      })
    } catch (error) {
      push({ variant: 'error', title: 'Verifikasi gagal', message: error.message })
    } finally {
      setVerifyingId(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Dashboard admin"
        description="Pantau pengguna, verifikasi driver, dan seluruh pesanan."
      />

      <div className="stats-grid">
        <StatCard
          icon="users"
          label="Total pengguna"
          value={users.length}
          hint={`${drivers.length} driver terdaftar`}
          tone="blue"
        />
        <StatCard
          icon="shield"
          label="Menunggu verifikasi"
          value={pendingDrivers.length}
          hint={
            pendingDrivers.length > 0
              ? `${pendingDrivers[0].name} menunggu persetujuan`
              : 'Semua driver sudah ditinjau'
          }
          tone="amber"
        />
        <StatCard
          icon="receipt"
          label="Total pesanan"
          value={bookings.length}
          hint={`${activeBookings.length} pesanan aktif`}
          tone="navy"
        />
        <StatCard
          icon="wallet"
          label="Pendapatan lunas"
          value={formatCurrency(revenue)}
          hint="Dari transaksi berstatus paid"
          tone="green"
        />
      </div>

      {pendingDrivers.length > 0 ? (
        <div className="alert alert--warning alert--banner">
          <Icon name="shield" size={18} />
          <div className="alert__body">
            <p>
              Ada <strong>{pendingDrivers.length}</strong> driver menunggu verifikasi:{' '}
              {pendingDrivers.map((driver) => driver.name).join(', ')}.
            </p>
          </div>
          <Button size="sm" onClick={() => setTab('drivers')} trailingIcon="arrow-right">
            Tinjau driver
          </Button>
        </div>
      ) : null}

      <Card>
        <div className="admin-toolbar">
          <div className="tabs" role="tablist" aria-label="Data admin">
            {TABS.map((item) => {
              const count =
                item.id === 'users'
                  ? users.length
                  : item.id === 'drivers'
                    ? drivers.length
                    : bookings.length

              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={['tabs__item', tab === item.id ? 'is-active' : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                  <span className="tabs__count">{count}</span>
                </button>
              )
            })}
          </div>

          <div className="search-box">
            <Icon name="search" size={17} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, email, atau ID"
              aria-label="Cari data"
            />
          </div>
        </div>

        {tab === 'bookings' ? (
          <div className="filter-chips filter-chips--wrap" role="group" aria-label="Filter status">
            {STATUS_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={['chip', statusFilter === item.id ? 'is-active' : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setStatusFilter(item.id)}
                aria-pressed={statusFilter === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        {tab === 'users' ? (
          filteredUsers.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Peran</th>
                    <th>Kontak</th>
                    <th>Bergabung</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="table-user">
                          <Avatar name={user.name} size="sm" />
                          <div>
                            <strong>{user.name}</strong>
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone="neutral">{ROLE_LABEL[user.role]}</Badge>
                      </td>
                      <td>{user.phone}</td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <div className="table-badges">
                          {user.role === 'driver' ? (
                            <VerificationBadge
                              status={user.vehicle?.verification_status ?? 'pending'}
                            />
                          ) : (
                            <Badge tone="completed">Aktif</Badge>
                          )}
                          {user.must_change_password ? (
                            <Badge tone="pending">Wajib ganti sandi</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        {user.role === 'admin' ? (
                          <span className="table-sub">Tidak dapat dikelola</span>
                        ) : (
                          <div className="table-actions">
                            <Button
                              size="sm"
                              variant="soft"
                              icon="lock"
                              onClick={() => openPasswordAction(user)}
                            >
                              Sandi
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              icon="refresh"
                              onClick={() => openAccountAction(user, 'reset')}
                            >
                              Reset
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              icon="trash"
                              onClick={() => openAccountAction(user, 'delete')}
                            >
                              Hapus
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="search"
              title="Pengguna tidak ditemukan"
              description="Coba kata kunci lain."
            />
          )
        ) : null}

        {tab === 'drivers' ? (
          filteredDrivers.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Kendaraan</th>
                    <th>Ketersediaan</th>
                    <th>Verifikasi</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((driver) => {
                    const status = driver.vehicle?.verification_status ?? 'pending'

                    return (
                      <tr key={driver.id}>
                        <td>
                          <div className="table-user">
                            <Avatar name={driver.name} size="sm" />
                            <div>
                              <strong>{driver.name}</strong>
                              <span>{driver.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          {VEHICLE_LABEL[driver.vehicle?.type] ?? '—'}
                          <span className="table-sub">{driver.vehicle?.plate ?? '—'}</span>
                        </td>
                        <td>
                          <AvailabilityBadge status={driver.vehicle?.availability_status} />
                        </td>
                        <td>
                          <VerificationBadge status={status} />
                        </td>
                        <td>
                          <div className="table-actions">
                            {status !== 'approved' ? (
                              <Button
                                size="sm"
                                variant="success"
                                icon="check"
                                onClick={() => handleVerify(driver, 'approved')}
                                disabled={verifyingId === driver.id}
                              >
                                {verifyingId === driver.id ? 'Memproses...' : 'Setujui'}
                              </Button>
                            ) : null}
                            {status !== 'rejected' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVerify(driver, 'rejected')}
                                disabled={verifyingId === driver.id}
                              >
                                Tolak
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="search"
              title="Driver tidak ditemukan"
              description="Coba kata kunci lain."
            />
          )
        ) : null}

        {tab === 'bookings' ? (
          filteredBookings.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Driver</th>
                    <th>Lokasi driver</th>
                    <th>Rute</th>
                    <th>Jadwal</th>
                    <th>Tarif</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <strong>{booking.id}</strong>
                        <span className="table-sub">{VEHICLE_LABEL[booking.vehicle_type]}</span>
                      </td>
                      <td>{booking.customer?.name ?? '—'}</td>
                      <td>{booking.driver?.name ?? '—'}</td>
                      <td>
                        {booking.driver_location
                          ? `${Number(booking.driver_location.lat).toFixed(5)}, ${Number(
                              booking.driver_location.lng,
                            ).toFixed(5)}`
                          : '—'}
                        {booking.driver_location ? (
                          <span className="table-sub">
                            {formatDateTime(booking.driver_location.updated_at)}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {booking.pickup_location}
                        <span className="table-sub">→ {booking.destination}</span>
                      </td>
                      <td>{formatDateTime(booking.scheduled_at)}</td>
                      <td>{formatCurrency(booking.estimated_fare)}</td>
                      <td>
                        <div className="table-badges">
                          <StatusBadge status={booking.status} />
                          <PaymentBadge status={booking.payment_status} />
                        </div>
                        <div className="table-actions">
                          {CANCELLABLE.includes(booking.status) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              icon="x"
                              onClick={() => openBookingAction(booking, 'cancel')}
                            >
                              Batalkan
                            </Button>
                          ) : null}
                          {booking.status === 'cancelled' ? (
                            <Button
                              size="sm"
                              variant="danger"
                              icon="trash"
                              onClick={() => openBookingAction(booking, 'delete')}
                            >
                              Hapus
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="search"
              title="Pesanan tidak ditemukan"
              description="Ubah kata kunci atau filter status pesanan."
            />
          )
        ) : null}

        <p className="table-footnote">
          {loading
            ? 'Memuat data terbaru dari server...'
            : 'Data ditampilkan sesuai sesi dan peran pengguna.'}
        </p>
      </Card>

      <Modal
        open={Boolean(actionBooking)}
        title={actionKind === 'delete' ? 'Hapus pesanan permanen?' : 'Batalkan pesanan?'}
        description={
          actionKind === 'delete'
            ? 'Data pesanan dan pembayaran terkait akan dihapus dari database. Tindakan ini tidak dapat dibatalkan.'
            : 'Pesanan yang dibatalkan tidak dapat dikembalikan. Customer dan driver terkait akan menerima notifikasi.'
        }
        onClose={() => {
          if (!actionBusy) {
            setActionBooking(null)
            setActionKind(null)
          }
        }}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setActionBooking(null)
                setActionKind(null)
              }}
              disabled={actionBusy}
            >
              Kembali
            </Button>
            <Button
              variant="danger"
              onClick={handleBookingAction}
              disabled={actionBusy}
              icon={actionKind === 'delete' ? 'trash' : 'x'}
            >
              {actionBusy
                ? 'Memproses...'
                : actionKind === 'delete'
                  ? 'Ya, hapus permanen'
                  : 'Ya, batalkan'}
            </Button>
          </>
        }
      >
        {actionBooking ? (
          <div className="modal-summary">
            <p className="modal-summary__id">{actionBooking.id}</p>
            <p>
              {actionBooking.customer?.name ?? 'Customer'} ·{' '}
              {actionBooking.pickup_location} → {actionBooking.destination}
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(accountTarget)}
        title={
          accountKind === 'delete' ? 'Hapus akun permanen?' : 'Reset data akun?'
        }
        description={
          accountKind === 'delete'
            ? accountIsDriver
              ? 'Akun driver beserta profil kendaraan, statistik, lokasi, dan notifikasinya akan dihapus permanen.'
              : 'Akun customer beserta seluruh pesanan, pembayaran, dan notifikasinya akan dihapus permanen.'
            : accountIsDriver
              ? 'Riwayat penugasan akan dilepas; statistik, rating, dan verifikasi driver dikembalikan ke kondisi awal. Akun tetap tersimpan.'
              : 'Seluruh pesanan, pembayaran, dan notifikasi milik customer ini akan dihapus. Akun tetap tersimpan.'
        }
        onClose={closeAccountAction}
        footer={
          <>
            <Button
              variant="outline"
              onClick={closeAccountAction}
              disabled={accountBusy}
            >
              Kembali
            </Button>
            <Button
              variant="danger"
              onClick={handleAccountAction}
              disabled={accountBusy}
              icon={accountKind === 'delete' ? 'trash' : 'refresh'}
            >
              {accountBusy
                ? 'Memproses...'
                : accountKind === 'delete'
                  ? 'Ya, hapus akun'
                  : 'Ya, reset akun'}
            </Button>
          </>
        }
      >
        {accountTarget ? (
          <div className="modal-summary">
            <p className="modal-summary__id">{accountTarget.name}</p>
            <p>
              {accountTarget.email} · {ROLE_LABEL[accountTarget.role]}
            </p>
            <p className="card__text">
              Reset atau hapus akan ditolak selama akun masih memiliki pesanan aktif.
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(passwordTarget)}
        title={passwordResult ? 'Sandi sementara dibuat' : 'Buat sandi sementara?'}
        description={
          passwordResult
            ? 'Salin sandi ini sekarang. Sandi tidak dapat ditampilkan lagi setelah modal ditutup.'
            : 'Sandi lama akan langsung tidak berlaku dan pengguna wajib menggantinya saat login berikutnya.'
        }
        onClose={closePasswordAction}
        footer={
          passwordResult ? (
            <Button onClick={closePasswordAction}>Tutup</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={closePasswordAction}
                disabled={passwordBusy}
              >
                Kembali
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={passwordBusy}
                icon="lock"
              >
                {passwordBusy ? 'Membuat...' : 'Ya, buat sandi sementara'}
              </Button>
            </>
          )
        }
      >
        {passwordTarget ? (
          <div className="modal-summary">
            <p className="modal-summary__id">{passwordTarget.name}</p>
            <p>
              {passwordTarget.email} · {ROLE_LABEL[passwordTarget.role]}
            </p>
            {passwordResult ? (
              <>
                <div className="alert alert--success" role="status">
                  <Icon name="check" size={18} />
                  <div className="alert__body">
                    <p>
                      Sampaikan sandi ini ke pengguna melalui kanal yang aman. Data
                      pesanan dan profil akun tidak berubah.
                    </p>
                  </div>
                </div>
                <div className="temp-password">
                  <code className="temp-password__value">
                    {passwordResult.temporary_password}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    icon="copy"
                    onClick={copyTemporaryPassword}
                  >
                    Salin
                  </Button>
                </div>
              </>
            ) : (
              <p className="card__text">
                Pengguna akan diminta mengganti sandi sebelum bisa mengakses dashboard.
              </p>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  )
}
