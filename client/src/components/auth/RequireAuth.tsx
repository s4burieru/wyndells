import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { Permission, Role } from '@/types'

/**
 * Guards a staff route group. Renders the nested routes (via Outlet) when the
 * session is valid and, when `role` or `permission` is given, the signed-in
 * user actually holds it.
 *
 * Failures land on `/staff`, which is itself never permission-gated — that
 * keeps a revoked permission from bouncing the user in a redirect loop.
 */
export function RequireAuth({ role, permission }: { role?: Role; permission?: Permission }) {
  const { user, loading, can } = useAuth()
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

  if (permission && !can(permission)) {
    return <Navigate to="/staff" replace />
  }

  return <Outlet />
}
