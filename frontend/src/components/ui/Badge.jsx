import { BOOKING_STATUS, PAYMENT_STATUS } from '../../lib/constants'

export function Badge({ tone = 'neutral', children, dot = false, className = '' }) {
  return (
    <span className={['badge', `badge--${tone}`, className].filter(Boolean).join(' ')}>
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const meta = BOOKING_STATUS[status] ?? { label: status, tone: 'neutral' }
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  )
}

export function PaymentBadge({ status = 'unpaid' }) {
  const meta = PAYMENT_STATUS[status] ?? PAYMENT_STATUS.unpaid
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

const VERIFICATION = {
  approved: { label: 'Terverifikasi', tone: 'completed' },
  pending: { label: 'Menunggu verifikasi', tone: 'pending' },
  rejected: { label: 'Ditolak', tone: 'cancelled' },
}

export function VerificationBadge({ status = 'pending' }) {
  const meta = VERIFICATION[status] ?? VERIFICATION.pending
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

export function AvailabilityBadge({ status = 'offline' }) {
  if (status === 'online') {
    return (
      <Badge tone="completed" dot>
        Online
      </Badge>
    )
  }

  return (
    <Badge tone="neutral" dot>
      Offline
    </Badge>
  )
}
