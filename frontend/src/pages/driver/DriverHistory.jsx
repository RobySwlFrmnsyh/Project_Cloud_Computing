import { useMemo, useState } from 'react'
import BookingCard from '../../components/booking/BookingCard'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { ACTIVE_STATUSES } from '../../lib/constants'

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'active', label: 'Aktif' },
  { id: 'completed', label: 'Selesai' },
  { id: 'cancelled', label: 'Dibatalkan' },
]

export default function DriverHistory() {
  const { user } = useAuth()
  const { bookings, loading } = useData()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const mine = useMemo(
    () =>
      bookings
        .filter((booking) => booking.driver_id === user.id)
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
      return [booking.id, booking.pickup_location, booking.destination, booking.customer?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized))
    })
  }, [mine, filter, query])

  const counts = useMemo(
    () => ({
      total: mine.length,
      active: mine.filter((booking) => ACTIVE_STATUSES.includes(booking.status)).length,
      completed: mine.filter((booking) => booking.status === 'completed').length,
      paid: mine.filter((booking) => booking.payment_status === 'paid').length,
    }),
    [mine],
  )

  return (
    <>
      <PageHeader
        eyebrow="Riwayat"
        title="Riwayat pesanan driver"
        description="Semua pesanan yang pernah kamu ambil, termasuk perjalanan selesai, pembayaran, dan kuitansi."
        actions={
          <Button to="/driver" variant="outline" icon="arrow-left">
            Dashboard
          </Button>
        }
      />

      <div className="history-stats">
        <div className="history-stat">
          <span className="history-stat__label">Total diambil</span>
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
        <div className="history-stat">
          <span className="history-stat__label">Lunas</span>
          <strong>{counts.paid}</strong>
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
              placeholder="Cari ID pesanan, lokasi, atau customer"
              aria-label="Cari riwayat pesanan driver"
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
                personName={booking.customer?.name ?? 'Customer'}
                to={`/driver/orders/${booking.id}`}
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
                : 'Belum ada pesanan pada filter ini. Ambil pesanan dari dashboard driver.'
            }
          >
            {query ? (
              <Button variant="outline" icon="refresh" onClick={() => setQuery('')}>
                Reset pencarian
              </Button>
            ) : (
              <Button to="/driver" icon="arrow-left">
                Kembali ke dashboard
              </Button>
            )}
          </EmptyState>
        )}
      </Card>
    </>
  )
}
