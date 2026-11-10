import { Link } from 'react-router-dom'
import { formatCurrency, formatDateTime } from '../../lib/format'
import { VEHICLE_LABEL } from '../../lib/constants'
import Icon from '../ui/Icon'
import { PaymentBadge, StatusBadge } from '../ui/Badge'

export default function BookingCard({ booking, to, driverName, personName, onDelete }) {
  return (
    <div className="booking-card-shell">
      <Link
        to={to}
        className={['booking-card', onDelete ? 'booking-card--deletable' : '']
          .filter(Boolean)
          .join(' ')}
      >
        <div className="booking-card__top">
          <div>
            <p className="booking-card__id">{booking.id}</p>
            <p className="booking-card__date">{formatDateTime(booking.scheduled_at)}</p>
          </div>
          <div className="booking-card__badges">
            <StatusBadge status={booking.status} />
            {booking.status === 'completed' ? (
              <PaymentBadge status={booking.payment_status} />
            ) : null}
          </div>
        </div>

        <div className="booking-card__route">
          <span className="route-mini" aria-hidden="true">
            <span className="route-mini__dot" />
            <span className="route-mini__bar" />
            <span className="route-mini__dot route-mini__dot--end" />
          </span>
          <div className="booking-card__places">
            <p>{booking.pickup_location}</p>
            <p>{booking.destination}</p>
          </div>
        </div>

        <div className="booking-card__meta">
          <span>
            <Icon name="car" size={15} />
            {VEHICLE_LABEL[booking.vehicle_type] ?? booking.vehicle_type}
          </span>
          <span>
            <Icon name="wallet" size={15} />
            {formatCurrency(booking.estimated_fare)}
          </span>
          <span>
            <Icon name="user" size={15} />
            {personName ?? driverName ?? 'Belum ada driver'}
          </span>
        </div>

        <span className="booking-card__cta">
          Lihat detail
          <Icon name="chevron-right" size={15} />
        </span>
      </Link>

      {onDelete ? (
        <button
          type="button"
          className="booking-card__delete"
          onClick={() => onDelete(booking)}
          aria-label={`Hapus permanen pesanan ${booking.id}`}
        >
          <Icon name="trash" size={15} />
          <span>Hapus</span>
        </button>
      ) : null}
    </div>
  )
}
