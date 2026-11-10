import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDateTime } from '../../lib/format'

const TYPE_ICON = {
  booking_created: 'receipt',
  booking_available: 'bell',
  booking_accepted: 'check',
  booking_arrived: 'map-pin',
  booking_in_progress: 'navigation',
  booking_completed: 'check',
  booking_cancelled: 'x',
  booking_rated: 'star',
  payment_created: 'wallet',
  payment_paid: 'check',
  payment_expired: 'alert',
  payment_failed: 'alert',
}

function bookingPath(role, code) {
  if (!code) return null
  if (role === 'customer') return `/app/bookings/${code}`
  if (role === 'driver') return `/driver/orders/${code}`
  return '/admin'
}

export default function Notifications() {
  const { user } = useAuth()
  const {
    notifications,
    unreadNotificationCount,
    notificationsPagination,
    loading,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useData()
  const { push } = useToast()
  const [busyId, setBusyId] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)

  const handleRead = async (notification) => {
    setBusyId(notification.id)
    try {
      await markNotificationRead(notification.id)
    } catch (error) {
      push({ variant: 'error', title: 'Gagal menandai', message: error.message })
    } finally {
      setBusyId(null)
    }
  }

  const handleReadAll = async () => {
    setMarkingAll(true)
    try {
      await markAllNotificationsRead()
      push({ title: 'Notifikasi dibersihkan', message: 'Semua notifikasi ditandai sudah dibaca.' })
    } catch (error) {
      push({ variant: 'error', title: 'Gagal menandai', message: error.message })
    } finally {
      setMarkingAll(false)
    }
  }

  if (loading && notifications.length === 0) {
    return <PageLoader label="Memuat notifikasi..." />
  }

  return (
    <>
      <PageHeader
        eyebrow="Notifikasi"
        title="Pemberitahuan akun"
        description={`${unreadNotificationCount} notifikasi belum dibaca dari total ${
          notificationsPagination?.total ?? notifications.length
        } notifikasi terbaru.`}
        actions={
          <>
            <Button
              variant="outline"
              icon="refresh"
              onClick={() => refreshNotifications().catch(() => {})}
            >
              Muat ulang
            </Button>
            <Button
              onClick={handleReadAll}
              disabled={markingAll || unreadNotificationCount === 0}
              icon="check"
            >
              {markingAll ? 'Memproses...' : 'Tandai semua dibaca'}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader
          title="Terbaru"
          subtitle="Pemberitahuan tersimpan di database dan diperbarui lewat realtime."
          action={
            unreadNotificationCount > 0 ? (
              <span className="badge badge--pending">{unreadNotificationCount} baru</span>
            ) : null
          }
        />

        {notifications.length > 0 ? (
          <div className="notification-list">
            {notifications.map((notification) => {
              const path = bookingPath(user.role, notification.booking_code)
              const body = (
                <>
                  <span className="notification-item__icon">
                    <Icon name={TYPE_ICON[notification.type] ?? 'bell'} size={17} />
                  </span>
                  <span className="notification-item__body">
                    <span className="notification-item__title">{notification.title}</span>
                    <span className="notification-item__message">{notification.message}</span>
                    <span className="notification-item__time">
                      {formatDateTime(notification.created_at)}
                    </span>
                  </span>
                </>
              )

              return (
                <article
                  key={notification.id}
                  className={[
                    'notification-item',
                    notification.read_at ? '' : 'notification-item--unread',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {path ? (
                    <Link to={path} className="notification-item__link">
                      {body}
                    </Link>
                  ) : (
                    <div className="notification-item__link">{body}</div>
                  )}
                  {!notification.read_at ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRead(notification)}
                      disabled={busyId === notification.id}
                    >
                      {busyId === notification.id ? '...' : 'Tandai dibaca'}
                    </Button>
                  ) : (
                    <span className="notification-item__read">Dibaca</span>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon="bell"
            title="Belum ada notifikasi"
            description="Pemberitahuan pesanan dan pembayaran akan muncul di sini."
          />
        )}
      </Card>
    </>
  )
}
