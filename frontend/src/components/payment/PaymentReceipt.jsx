import { PaymentBadge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import { PAYMENT_METHOD, ROLE_LABEL } from '../../lib/constants'
import { formatCurrency, formatDateTime } from '../../lib/format'

export default function PaymentReceipt({
  booking,
  payment = booking?.payment,
  title = 'Pembayaran lunas',
  description,
  actions,
}) {
  const method = payment?.method ?? booking?.payment_method
  const methodLabel = PAYMENT_METHOD[method]?.label ?? 'Tunai'
  const paidAt = payment?.paid_at ?? booking?.paid_at

  return (
    <Card className="receipt">
      <span className="receipt__icon" aria-hidden="true">
        <Icon name="check" size={26} strokeWidth={2.4} />
      </span>
      <h2>{title}</h2>
      <p className="receipt__text">
        {description ??
          `Transaksi tercatat pada ${formatDateTime(paidAt)} dengan metode ${methodLabel}.`}
      </p>
      <dl className="summary-list">
        <div className="summary-row">
          <dt>Nomor pembayaran</dt>
          <dd>{payment?.id ? `#${payment.id}` : '—'}</dd>
        </div>
        <div className="summary-row">
          <dt>ID pesanan</dt>
          <dd>{booking?.id ?? '—'}</dd>
        </div>
        <div className="summary-row">
          <dt>Metode</dt>
          <dd>{methodLabel}</dd>
        </div>
        <div className="summary-row">
          <dt>Nominal</dt>
          <dd>{formatCurrency(payment?.amount ?? booking?.estimated_fare)}</dd>
        </div>
        <div className="summary-row">
          <dt>Waktu bayar</dt>
          <dd>{formatDateTime(paidAt)}</dd>
        </div>
        <div className="summary-row">
          <dt>Referensi</dt>
          <dd>{payment?.provider_ref ?? '—'}</dd>
        </div>
        <div className="summary-row">
          <dt>Dikonfirmasi oleh</dt>
          <dd>{confirmationLabel(payment)}</dd>
        </div>
        <div className="summary-row">
          <dt>Status</dt>
          <dd>
            <PaymentBadge status={payment?.status ?? booking?.payment_status} />
          </dd>
        </div>
      </dl>
      {actions ? <div className="receipt__actions">{actions}</div> : null}
    </Card>
  )
}

function confirmationLabel(payment) {
  if (payment?.confirmed_by?.name) {
    const role = ROLE_LABEL[payment.confirmed_by.role] ?? payment.confirmed_by.role
    return `${payment.confirmed_by.name} (${role})`
  }
  return 'Driver'
}
