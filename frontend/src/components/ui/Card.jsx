import Icon from './Icon'

export function Card({ as: Tag = 'section', className = '', children, ...rest }) {
  return (
    <Tag className={['card', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, subtitle, action, children, className = '' }) {
  return (
    <header className={['card__head', className].filter(Boolean).join(' ')}>
      <div className="card__headings">
        <h2 className="card__title">{title}</h2>
        {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="card__action">{action}</div> : null}
      {children}
    </header>
  )
}

export default function StatCard({ icon, label, value, hint, tone = 'navy' }) {
  return (
    <div className="stat">
      <span className={`stat__icon stat__icon--${tone}`} aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <div className="stat__body">
        <p className="stat__label">{label}</p>
        <p className="stat__value">{value}</p>
        {hint ? <p className="stat__hint">{hint}</p> : null}
      </div>
    </div>
  )
}
