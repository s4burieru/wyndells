import { type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import jwt from 'jsonwebtoken'
import { getDb } from '../config/database'
import { ApiError } from '../utils/ApiError'

export type UserRole = 'admin' | 'manager'

export type AuthUser = {
  id: string
  role: UserRole
  /** Assigned branch id (managers) or null (admins). */
  branch: string | null
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
 * Throws when a manager tries to operate on a branch other than their own.
 * Admins are allowed to operate on any branch.
 */
export function assertBranchAccess(user: AuthUser, branchId: string | null | undefined): void {
  if (branchId === undefined || branchId === null || branchId === '') {
    return
  }
  if (user.role === 'admin') {
    return
  }
  if (user.branch !== branchId) {
    throw new ApiError(403, 'You can only manage the branch assigned to you.')
  }
}