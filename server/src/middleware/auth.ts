import { type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import jwt from 'jsonwebtoken'
import { getDb } from '../config/database'
import { ApiError } from '../utils/ApiError'
import type { UserRole } from '../constants'
import { type Permission } from '../constants/permissions'
import { getRolePermissions } from '../services/permission.service'

export type { UserRole }

export type AuthUser = {
  id: string
  role: UserRole
  /** Assigned branch id (managers) or null (admins / HR). */
  branch: string | null
  /** Everything this user's role is currently allowed to do. */
  permissions: Permission[]
}

/** Request type used by controllers that require an authenticated user. */
export type AuthedRequest = Request & { user: AuthUser }

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 16) {
    console.warn?.('JWT_SECRET is missing or too short. Falling back to a development secret.')
    return 'wyndells-dev-secret-change-me-0123456789'
  }
  return secret
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, role: user.role, branch: user.branch },
    getJwtSecret(),
    { expiresIn: '7d' },
  )
}

/**
 * Verifies the Bearer token and resolves the current user from the database
 * so deactivated accounts and reassigned branches take effect immediately,
 * without waiting for the token to expire.
 */
export async function authenticateUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    next(new ApiError(401, 'Authentication required. Please sign in.'))
    return
  }

  try {
    const decoded = jwt.verify(header.slice('Bearer '.length), getJwtSecret())
    if (typeof decoded === 'string' || !decoded.sub) {
      next(new ApiError(401, 'Invalid or expired session. Please sign in again.'))
      return
    }

    const { data: user, error } = await getDb()
      .from('users')
      .select('id, name, role, assigned_branch_id, is_active')
      .eq('id', String(decoded.sub))
      .maybeSingle()
    if (error || !user || !user.is_active) {
      next(new ApiError(401, 'Your account is unavailable. Please contact support.'))
      return
    }

    const authUser: AuthUser = {
      id: user.id,
      role: user.role,
      branch: user.assigned_branch_id,
      // Resolved per request so a permission change takes effect on the very
      // next call — no waiting for the JWT (7 days) to expire.
      permissions: await getRolePermissions(user.role),
    }

    ;(req as AuthedRequest).user = authUser
    next()
  } catch {
    next(new ApiError(401, 'Invalid or expired session. Please sign in again.'))
  }
}

/** Restricts a route to the given roles, e.g. authorizeRole('admin'). */
export function authorizeRole(...roles: readonly UserRole[]): RequestHandler {
  return (req, _res, next) => {
    const user = (req as AuthedRequest).user
    if (!user || !roles.includes(user.role)) {
      next(new ApiError(403, 'You do not have permission to perform this action.'))
      return
    }
    next()
  }
}

/**
 * Restricts a route to holders of any listed permission, e.g.
 * authorizePermission('careers.manage'). Permissions come from the caller's
 * role (see `getRolePermissions`), so an administrator always passes.
 *
 * Use this instead of `authorizeRole` wherever access should be adjustable
 * from Settings → Roles & Permissions.
 */
export function authorizePermission(...permissions: readonly Permission[]): RequestHandler {
  return (req, _res, next) => {
    const user = (req as AuthedRequest).user
    if (!user || !permissions.some((permission) => user.permissions.includes(permission))) {
      // The required key is kept out of the response — it is for server logs,
      // not for the browser.
      next(new ApiError(403, 'You do not have permission to perform this action.'))
      return
    }
    next()
  }
}

/** True when the user holds the permission (admins always do). */
export function hasPermission(user: AuthUser, permission: Permission): boolean {
  return user.role === 'admin' || user.permissions.includes(permission)
}

/**
 * Throws when a manager tries to operate on a branch other than their own.
 * Admins and HR work across every branch, so only managers are constrained.
 */
export function assertBranchAccess(user: AuthUser, branchId: string | null | undefined): void {
  if (branchId === undefined || branchId === null || branchId === '') {
    return
  }
  if (user.role !== 'manager') {
    return
  }
  if (user.branch !== branchId) {
    throw new ApiError(403, 'You can only manage the branch assigned to you.')
  }
}
