import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageLoader } from '@/components/ui/Feedback'

/**
 * Gate for authenticated routes. Anyone without a session lands on /login with the attempted URL
 * remembered, and anyone who has not picked a nickname yet is pushed through that step first —
 * the backend refuses to create content without one.
 */
export function ProtectedRoute({ requireNickname = true }) {
  const { isAuthenticated, loading, needsNickname } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireNickname && needsNickname) {
    return <Navigate to="/setup-nickname" state={{ from: location }} replace />
  }

  return <Outlet />
}
