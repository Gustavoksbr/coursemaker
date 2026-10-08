import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useAuthModal } from '@/context/AuthModalContext'
import { PageLoader } from '@/components/ui/Feedback'

/**
 * Gate for authenticated routes. Anyone without a session stays on the URL they asked for and gets
 * the login dialog over it - once they sign in, the page simply appears, no redirect involved.
 * Anyone who has not picked a nickname yet is pushed through that step first - the backend
 * refuses to create content without one. `requireAdmin` additionally sends anyone without the
 * admin role back to the homepage, no explanation page - there's nothing for a non-admin to do there.
 */
export function ProtectedRoute({ requireNickname = true, requireAdmin = false }) {
  const { isAuthenticated, loading, needsNickname, isAdmin } = useAuth()
  const { openLogin } = useAuthModal()
  const location = useLocation()
  const needsLogin = !loading && !isAuthenticated

  // Open the dialog once per visit to a protected URL; closing it leaves the prompt below in place.
  useEffect(() => {
    if (needsLogin) openLogin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsLogin, location.pathname])

  if (loading) return <PageLoader />

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <LogIn size={36} className="text-brand-400" />
        <h1 className="text-xl font-bold text-slate-100">Entre para continuar</h1>
        <p className="text-sm text-slate-400">Esta pagina so esta disponivel para quem tem uma conta.</p>
        <button type="button" className="btn-primary" onClick={openLogin}>
          Entrar
        </button>
      </div>
    )
  }

  if (requireNickname && needsNickname) {
    return <Navigate to="/setup-nickname" state={{ from: location }} replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
