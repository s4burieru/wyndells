import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import type { AuthedRequest } from '../middleware/auth'
import {
  getPermissionMatrix,
  permissionCatalog,
  setRolePermissions,
} from '../services/permission.service'
import { recordActivity } from '../services/activity.service'

/**
 * The whole Roles & Permissions screen in one payload: the grouped catalog to
 * render, and the current matrix (which permissions each configurable role
 * holds). Administrators always see every permission in their own column.
 */
export const getRolePermissionsController = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const matrix = await getPermissionMatrix()
  res.json({ ...permissionCatalog(), matrix })
})

/** Replaces one role's grants. The admin column itself can never be edited. */
export const updateRolePermissionsController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = req.body as { role?: unknown; permissions?: unknown }
  const role = String(body.role ?? '')
  const permissions = await setRolePermissions(role, body.permissions)

  void recordActivity({
    actorId: req.user.id,
    branchId: null,
    action: 'roles.permissions_updated',
    summary: `Updated permissions for the ${role} role (${permissions.length} granted)`,
    entity: 'role',
    entityId: role,
  })

  res.json({ role, permissions })
})
