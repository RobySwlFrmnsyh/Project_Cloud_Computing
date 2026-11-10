export default function PageLoader({ label = 'Memuat data...', full = false }) {
  return (
    <div
      className={['page-loader', full ? 'page-loader--full' : ''].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className="page-loader__spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}
