import Icon from '../ui/Icon'
import { BOOKING_STATUS, STATUS_FLOW } from '../../lib/constants'

export default function TripTimeline({ status, compact = false }) {
  if (status === 'cancelled') {
    return (
      <div className="timeline-cancelled">
        <span className="timeline-cancelled__icon" aria-hidden="true">
          <Icon name="x" size={18} />
        </span>
        <div>
          <p className="timeline-cancelled__title">Pesanan dibatalkan</p>
          <p className="timeline-cancelled__desc">
            Pesanan ini tidak dilanjutkan. Silakan buat pesanan baru bila masih membutuhkan
            perjalanan.
          </p>
        </div>
      </div>
    )
  }

  const currentIndex = Math.max(0, STATUS_FLOW.indexOf(status))

  return (
    <ol className={['timeline', compact ? 'timeline--compact' : ''].filter(Boolean).join(' ')}>
      {STATUS_FLOW.map((step, index) => {
        const meta = BOOKING_STATUS[step]
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'next'

        return (
          <li key={step} className={`timeline__item timeline__item--${state}`}>
            <span className="timeline__dot" aria-hidden="true">
              {state === 'done' ? <Icon name="check" size={12} strokeWidth={2.6} /> : null}
            </span>
            <div className="timeline__body">
              <p className="timeline__label">{meta.label}</p>
              {compact ? null : <p className="timeline__desc">{meta.description}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
