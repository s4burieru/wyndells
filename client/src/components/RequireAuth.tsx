import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import type { Role } from '../lib/types'

/**
 * Guards a staff route group. Renders the nested routes (via Outlet) when the
 * session is valid and, when `role` is given, the user has that role.
 * Unauthenticated users are redirected to the staff login.
 */
export function RequireAuth({ role }: { role?: Role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">Verifying your session…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />
  }

  if (role && user.role !== role) {
    return <Navigate to="/staff" replace />
  }

  return <Outlet />
}