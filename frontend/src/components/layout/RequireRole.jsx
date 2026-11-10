import { Navigate, useLocation } from 'react-router-dom'
import PageLoader from '../ui/PageLoader'
import { useAuth } from '../../context/AuthContext'
import { HOME_PATH } from '../../lib/constants'

export default function RequireRole({ role, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageLoader full label="Memeriksa akses..." />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (user.must_change_password) {
    return <Navigate to="/change-password" replace />
  }

  if (user.role !== role) {
    return <Navigate to={HOME_PATH[user.role] ?? '/'} replace />
  }

  return children
}
