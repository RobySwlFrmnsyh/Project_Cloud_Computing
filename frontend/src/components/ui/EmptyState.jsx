import Icon from './Icon'

export default function EmptyState({
  icon = 'info',
  title,
  description,
  children,
  className = '',
}) {
  return (
    <div className={['empty', className].filter(Boolean).join(' ')}>
      <span className="empty__icon" aria-hidden="true">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="empty__title">{title}</h3>
      {description ? <p className="empty__desc">{description}</p> : null}
      {children ? <div className="empty__actions">{children}</div> : null}
    </div>
  )
}
