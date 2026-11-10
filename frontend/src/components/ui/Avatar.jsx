import { initials } from '../../lib/format'

const TONES = ['navy', 'blue', 'amber', 'green', 'violet']

function toneFor(name = '') {
  const sum = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0)
  return TONES[sum % TONES.length]
}

export default function Avatar({ name = '', size = 'md', tone, className = '' }) {
  const resolvedTone = tone ?? toneFor(name)

  return (
    <span
      className={['avatar', `avatar--${size}`, `avatar--${resolvedTone}`, className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      {initials(name) || '?'}
    </span>
  )
}
