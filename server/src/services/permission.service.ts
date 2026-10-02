import { getDb } from '../config/database'
import { ApiError } from '../utils/ApiError'
import type { UserRole } from '../constants'
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_GROUPS,
  defaultPermissionsFor,
  isConfigurableRole,
  isPermission,
  type ConfigurableRole,
  type Permission,
} from '../constants/permissions'

const ROLE_PERMISSIONS_TABLE = 'role_permissions'

/**
 * Resolves what a role is currently allowed to do.
 *
 * - Admins always hold every permission; the matrix never stores their column,
 *   so it can never be narrowed down (and a damaged table can't lock them out).
 * - Other roles read their grants from `role_permissions`. When the table is
 *   unreachable or has not been seeded yet (migration not applied), the
 *   built-in defaults are used instead — a missing migration degrades to the
 *   old behaviour rather than a dead portal.
 *
 * An empty-but-seeded table is honoured: revoking every permission from a role
 * really does revoke everything.
 */
export async function getRolePermissions(role: UserRole): Promise<Permission[]> {
  if (role === 'admin') {
    return [...PERMISSIONS]
  }

  try {
    const { data, error } = await getDb()
      .from(ROLE_PERMISSIONS_TABLE)
      .select('permission')
      .eq('role', role)

    // Table missing (migration not applied yet) → shipped defaults.
    if (error) {
      return [...defaultPermissionsFor(role)]
    }
    // Table present means migration 0007 seeded it, so an empty result is a
    // deliberate "this role holds nothing" rather than an accident.
    return (data ?? []).map((row) => row.permission).filter(isPermission)
  } catch {
    // Never let a permissions lookup fail a request: degrade to the defaults.
    return [...defaultPermissionsFor(role)]
  }
}

/** The full matrix for the Roles & Permissions screen. */
export async function getPermissionMatrix(): Promise<Record<ConfigurableRole, Permission[]>> {
  const { data, error } = await getDb().from(ROLE_PERMISSIONS_TABLE).select('role, permission')
  const rows = error ? [] : ((data ?? []) as { role: string; permission: string }[])

  const matrix = {} as Record<ConfigurableRole, Permission[]>
  const seeded = !error // table exists → migration 0007 seeded it
  for (const role of ['manager', 'hr'] as const) {
    const granted = rows.filter((row) => row.role === role).map((row) => row.permission).filter(isPermission)
    matrix[role] = seeded ? granted : [...DEFAULT_ROLE_PERMISSIONS[role]]
  }
  return matrix
}

/**
 * Replaces a role's grants wholesale. `roles.manage` is stripped — only the
 * locked admin column can hold it — and unknown keys are rejected outright.
 */
export async function setRolePermissions(role: string, permissions: unknown): Promise<Permission[]> {
  if (!isConfigurableRole(role)) {
    throw new ApiError(400, 'Permissions can only be changed for the manager and hr roles.')
  }
  if (!Array.isArray(permissions)) {
    throw new ApiError(400, 'Permissions must be an array of permission keys.')
  }
  const invalid = permissions.filter((value) => !isPermission(value))
  if (invalid.length > 0) {
    throw new ApiError(400, `Unknown permission: ${String(invalid[0])}.`)
  }

  const next = [...new Set(permissions.filter(isPermission))].filter((key) => key !== 'roles.manage')

  const { error: deleteError } = await getDb().from(ROLE_PERMISSIONS_TABLE).delete().eq('role', role)
  if (deleteError) {
    throw new ApiError(500, 'Could not update role permissions.')
  }
  if (next.length > 0) {
    const { error: insertError } = await getDb()
      .from(ROLE_PERMISSIONS_TABLE)
      .insert(next.map((permission) => ({ role, permission })))
    if (insertError) {
      throw new ApiError(500, 'Could not update role permissions.')
    }
  }
  return next
}

/** The catalog the settings screen renders: groups, entries and role columns. */
export function permissionCatalog() {
  return {
    groups: PERMISSION_GROUPS,
    roles: [
      { key: 'admin', label: 'Administrator', locked: true, permissions: [...PERMISSIONS] },
      { key: 'manager', label: 'Manager', locked: false },
      { key: 'hr', label: 'HR', locked: false },
    ],
  }
}
