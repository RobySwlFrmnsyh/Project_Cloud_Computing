import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function Logo({ variant = 'light', to = '/', size = 'md' }) {
  return (
    <Link
      to={to}
      className={`brand brand--${variant} brand--${size}`}
      aria-label="Anter Jemput Teman — beranda"
    >
      <span className="brand__mark" aria-hidden="true">
        <Icon name="navigation" size={size === 'sm' ? 15 : 18} strokeWidth={2} />
      </span>
      <span className="brand__text">
        Anter<span className="brand__accent">Jemput</span>
      </span>
    </Link>
  )
}
