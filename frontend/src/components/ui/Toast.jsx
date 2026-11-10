import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import Icon from './Icon'

const ToastContext = createContext(null)

const ICON_BY_VARIANT = {
  success: 'check',
  error: 'alert',
  info: 'info',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (toast) => {
      const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`
      setToasts((prev) => [...prev.slice(-2), { id, variant: 'success', ...toast }])
      window.setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.variant}`}>
            <span className="toast__icon" aria-hidden="true">
              <Icon name={ICON_BY_VARIANT[toast.variant] ?? 'info'} size={18} />
            </span>
            <div className="toast__body">
              <p className="toast__title">{toast.title}</p>
              {toast.message ? <p className="toast__message">{toast.message}</p> : null}
            </div>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(toast.id)}
              aria-label="Tutup notifikasi"
            >
              <Icon name="x" size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast harus dipakai di dalam ToastProvider')
  }
  return context
}
