import { useState } from 'react'
import { useParams } from 'react-router-dom'
import RouteInfo from '../../components/booking/RouteInfo'
import PaymentReceipt from '../../components/payment/PaymentReceipt'
import { PaymentBadge, StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { VEHICLE_LABEL } from '../../lib/constants'
import { formatCurrency, formatDateTime } from '../../lib/format'

export default function Payment() {
  const { bookingId } = useParams()
  const { user } = useAuth()
  const { bookings, loading, createPayment, refresh } = useData()
  const { push } = useToast()

  const booking = bookings.find((candidate) => candidate.id === bookingId)
  const [busy, setBusy] = useState(false)

  if (loading && !booking) {
    return <PageLoader label="Memuat pembayaran..." />
  }

  if (!booking || booking.customer_id !== user.id) {
    return (
      <Card>
        <EmptyState
          icon="alert"
          title="Pesanan tidak ditemukan"
          description="Pembayaran hanya dapat diakses dari pesanan milik akunmu."
        >
          <Button to="/app" icon="arrow-left">
            Kembali ke dashboard
          </Button>
        </EmptyState>
      </Card>
    )
  }

  const driver = booking.driver
  const paid = booking.payment_status === 'paid'
  const completed = booking.status === 'completed'
  const pending = booking.payment_status === 'pending'

  const run = async (action, success) => {
    setBusy(true)
    try {
      await action()
      push(success)
    } catch (error) {
      push({ variant: 'error', title: 'Pembayaran gagal', message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const handleCash = () =>
    run(
      () => createPayment(booking.id),
      {
        title: 'Pembayaran tunai dicatat',
        message:
          'Driver akan mengonfirmasi setelah menerima uang tunai. Transaksi ini hanya simulasi.',
        variant: 'info',
      },
    )

  const handleRefresh = () =>
    run(
      () => refresh({ silent: true }),
      { title: 'Status diperbarui', message: 'Menampilkan status pembayaran terbaru.' },
    )

  return (
    <>
      <PageHeader
        eyebrow="Pembayaran"
        title={`Pembayaran ${booking.id}`}
        description="Pembayaran dilakukan tunai kepada driver. Driver mengonfirmasi setelah uang diterima."
        actions={
          <Button to={`/app/bookings/${booking.id}`} variant="outline" icon="arrow-left">
            Detail perjalanan
          </Button>
        }
      />

      <div className="payment-grid">
        <div className="payment-main">
          <Card>
            <div className="invoice">
              <div className="invoice__head">
                <div>
                  <p className="invoice__eyebrow">Total tagihan</p>
                  <p className="invoice__amount">{formatCurrency(booking.estimated_fare)}</p>
                </div>
                <PaymentBadge status={booking.payment_status} />
              </div>

              <RouteInfo pickup={booking.pickup_location} destination={booking.destination} />

              <dl className="summary-list">
                <div className="summary-row">
                  <dt>ID pesanan</dt>
                  <dd>{booking.id}</dd>
                </div>
                <div className="summary-row">
                  <dt>Jadwal perjalanan</dt>
                  <dd>{formatDateTime(booking.scheduled_at)}</dd>
                </div>
                <div className="summary-row">
                  <dt>Driver</dt>
                  <dd>{driver?.name ?? 'Belum ada driver'}</dd>
                </div>
                <div className="summary-row">
                  <dt>Kendaraan</dt>
                  <dd>{VEHICLE_LABEL[booking.vehicle_type] ?? booking.vehicle_type}</dd>
                </div>
                <div className="summary-row">
                  <dt>Metode</dt>
                  <dd>{booking.payment_method ? 'Tunai' : 'Belum dipilih'}</dd>
                </div>
                <div className="summary-row summary-row--total">
                  <dt>Jumlah dibayar</dt>
                  <dd>{formatCurrency(booking.estimated_fare)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          {!completed ? (
            <div className="alert alert--warning">
              <Icon name="clock" size={18} />
              <div className="alert__body">
                <p>
                  Pembayaran dapat diselesaikan setelah perjalanan berstatus{' '}
                  <strong>selesai</strong>. Saat ini pesanan masih{' '}
                  {formatStatus(booking.status)}.
                </p>
              </div>
            </div>
          ) : paid ? (
            <PaymentReceipt
              booking={booking}
              payment={booking.payment}
              actions={
                <>
                  <Button to="/app/history" variant="outline">
                    Lihat riwayat
                  </Button>
                  <Button to={`/app/bookings/${booking.id}`} icon="receipt">
                    Detail pesanan
                  </Button>
                </>
              }
            />
          ) : pending ? (
            <Card>
              <CardHeader
                title="Menunggu konfirmasi driver"
                subtitle="Pembayaran tunai dicatat di server dan menunggu driver mengonfirmasi."
              />
              <div className="notice notice--info">
                <Icon name="info" size={18} />
                <p>
                  Serahkan uang tunai kepada driver. Setelah driver mengonfirmasi lewat
                  dashboard-nya, status pembayaran berubah menjadi <strong>lunas</strong>.
                  Transaksi ini hanya simulasi, tidak ada uang sungguhan yang diproses.
                </p>
              </div>
              <div className="receipt__actions">
                <Button icon="refresh" variant="outline" onClick={handleRefresh} disabled={busy}>
                  Cek status terbaru
                </Button>
                <Button to={`/app/bookings/${booking.id}`} icon="receipt">
                  Detail pesanan
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader
                title="Pembayaran tunai"
                subtitle="Catat pembayaran, lalu driver mengonfirmasi setelah uang diterima."
              />
              <div className="notice notice--info">
                <Icon name="info" size={18} />
                <p>
                  Pembayaran diberikan langsung kepada driver. Tombol di bawah mencatat
                  pembayaran di server; driver kemudian mengonfirmasi bahwa uang sudah
                  diterima. Transaksi ini hanya simulasi.
                </p>
              </div>
              <Button icon="wallet" onClick={handleCash} disabled={busy}>
                {busy ? 'Memproses...' : 'Catat pembayaran tunai (simulasi)'}
              </Button>
            </Card>
          )}
        </div>

        <aside className="payment-side">
          <Card>
            <CardHeader title="Status pesanan" />
            <div className="payment-side__status">
              <StatusBadge status={booking.status} />
              <PaymentBadge status={booking.payment_status} />
            </div>
            <dl className="summary-list">
              <div className="summary-row">
                <dt>Customer</dt>
                <dd>{user.name}</dd>
              </div>
              <div className="summary-row">
                <dt>Driver</dt>
                <dd>{driver?.name ?? '—'}</dd>
              </div>
              <div className="summary-row">
                <dt>Selesai pada</dt>
                <dd>{booking.status === 'completed' ? 'Sudah selesai' : 'Belum selesai'}</dd>
              </div>
            </dl>
            <Button variant="outline" block icon="refresh" onClick={handleRefresh} disabled={busy}>
              Muat ulang status
            </Button>
          </Card>

          <Card className="card--tint">
            <CardHeader title="Pembayaran simulasi" />
            <p className="card__text">
              Data pembayaran tersimpan untuk keperluan riwayat. Tidak ada uang sungguhan
              yang diproses; seluruh pembayaran masih simulasi tunai.
            </p>
          </Card>
        </aside>
      </div>
    </>
  )
}

function formatStatus(status) {
  return status === 'pending' ? 'menunggu driver' : status.replace('_', ' ')
}
