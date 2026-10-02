import { apiRequest } from '@/services/api/client'
import type { Permission, Role } from '@/types'

/** One line of the matrix, as the server's catalog describes it. */
export type PermissionEntry = { key: Permission; label: string; hint?: string }

export type PermissionGroup = { key: string; label: string; permissions: PermissionEntry[] }

/** Column header for a role in the matrix; `locked` roles cannot be edited. */
export type RoleColumn = { key: Role; label: string; locked: boolean; permissions?: Permission[] }

export type ConfigurableRoleKey = 'manager' | 'hr'

/** Which permissions each editable role currently holds. */
export type RoleMatrix = Record<ConfigurableRoleKey, Permission[]>

export type RolePermissionsResult = {
  groups: PermissionGroup[]
  roles: RoleColumn[]
  matrix: RoleMatrix
}

/** Admin-only: the catalog to render plus the current grants per role. */
export function fetchRolePermissions(): Promise<RolePermissionsResult> {
  return apiRequest<RolePermissionsResult>('/api/roles/permissions')
}

/** Admin-only: replaces one role's grants outright (an empty array revokes all). */
export function saveRolePermissions(
  role: ConfigurableRoleKey,
  permissions: Permission[],
): Promise<{ role: Role; permissions: Permission[] }> {
  return apiRequest('/api/roles/permissions', {
    method: 'PUT',
    body: { role, permissions },
  })
}
