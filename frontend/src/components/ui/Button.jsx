import { Link } from 'react-router-dom'
import Icon from './Icon'

const VARIANTS = new Set([
  'primary',
  'accent',
  'outline',
  'soft',
  'ghost',
  'ghost-light',
  'danger',
  'success',
])

export default function Button({
  to,
  variant = 'primary',
  size,
  block = false,
  icon,
  trailingIcon,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${VARIANTS.has(variant) ? variant : 'primary'}`,
    size ? `btn--${size}` : '',
    block ? 'btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {icon ? <Icon name={icon} size={18} /> : null}
      <span>{children}</span>
      {trailingIcon ? <Icon name={trailingIcon} size={18} /> : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  )
}
