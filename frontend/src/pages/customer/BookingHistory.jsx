import { useMemo, useState } from 'react'
import BookingCard from '../../components/booking/BookingCard'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { ACTIVE_STATUSES } from '../../lib/constants'

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'active', label: 'Aktif' },
  { id: 'completed', label: 'Selesai' },
  { id: 'cancelled', label: 'Dibatalkan' },
]

export default function BookingHistory() {
  const { user } = useAuth()
  const { bookings, loading, deleteBooking } = useData()
  const { push } = useToast()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const mine = useMemo(
    () =>
      bookings
        .filter((booking) => booking.customer_id === user.id)
        .sort((first, second) => new Date(second.scheduled_at) - new Date(first.scheduled_at)),
    [bookings, user.id],
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return mine.filter((booking) => {
      if (filter === 'active' && !ACTIVE_STATUSES.includes(booking.status)) return false
      if (filter === 'completed' && booking.status !== 'completed') return false
      if (filter === 'cancelled' && booking.status !== 'cancelled') return false

      if (!normalized) return true
      return [booking.id, booking.pickup_location, booking.destination].some((value) =>
        value.toLowerCase().includes(normalized),
      )
    })
  }, [mine, filter, query])

  const counts = useMemo(
    () => ({
      total: mine.length,
      active: mine.filter((booking) => ACTIVE_STATUSES.includes(booking.status)).length,
      completed: mine.filter((booking) => booking.status === 'completed').length,
    }),
    [mine],
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteBooking(deleteTarget.id)
      push({
        title: 'Pesanan dihapus permanen',
        message: `${deleteTarget.id} sudah tidak tersimpan di database.`,
        variant: 'info',
      })
      setDeleteTarget(null)
    } catch (error) {
      push({ variant: 'error', title: 'Gagal menghapus', message: error.message })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Riwayat"
        title="Riwayat pesanan"
        description="Semua perjalanan yang pernah kamu buat, termasuk pesanan aktif dan yang dibatalkan."
        actions={
          <Button to="/app/bookings/new" icon="plus">
            Buat pesanan
          </Button>
        }
      />

      <div className="history-stats">
        <div className="history-stat">
          <span className="history-stat__label">Total pesanan</span>
          <strong>{counts.total}</strong>
        </div>
        <div className="history-stat">
          <span className="history-stat__label">Sedang berjalan</span>
          <strong>{counts.active}</strong>
        </div>
        <div className="history-stat">
          <span className="history-stat__label">Selesai</span>
          <strong>{counts.completed}</strong>
        </div>
      </div>

      <Card>
        <div className="toolbar">
          <div className="search-box">
            <Icon name="search" size={17} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari ID pesanan atau lokasi"
              aria-label="Cari pesanan"
            />
          </div>

          <div className="filter-chips" role="group" aria-label="Filter status pesanan">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={['chip', filter === item.id ? 'is-active' : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <p className="list-count">
          Menampilkan <strong>{filtered.length}</strong> dari {counts.total} pesanan
        </p>

        {loading && mine.length === 0 ? (
          <p className="list-count">Memuat riwayat pesanan...</p>
        ) : filtered.length > 0 ? (
          <div className="booking-list">
            {filtered.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                driverName={booking.driver?.name}
                to={`/app/bookings/${booking.id}`}
                onDelete={booking.status === 'cancelled' ? setDeleteTarget : undefined}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="search"
            title="Tidak ada pesanan yang cocok"
            description={
              query
                ? 'Coba kata kunci lain atau ubah filter status pesanan.'
                : 'Belum ada pesanan pada filter ini. Buat pesanan baru untuk memulai.'
            }
          >
            {query ? (
              <Button variant="outline" icon="refresh" onClick={() => setQuery('')}>
                Reset pencarian
              </Button>
            ) : (
              <Button to="/app/bookings/new" icon="plus">
                Buat pesanan
              </Button>
            )}
          </EmptyState>
        )}
      </Card>

      <Modal
        open={Boolean(deleteTarget)}
        title="Hapus pesanan permanen?"
        description="Data pesanan dan pembayaran terkait akan dihapus dari database. Tindakan ini tidak dapat dibatalkan."
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting} icon="trash">
              {deleting ? 'Menghapus...' : 'Ya, hapus permanen'}
            </Button>
          </>
        }
      >
        {deleteTarget ? (
          <div className="modal-summary">
            <p className="modal-summary__id">{deleteTarget.id}</p>
            <p>
              {deleteTarget.pickup_location} → {deleteTarget.destination}
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
