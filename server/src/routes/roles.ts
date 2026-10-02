import { Router } from 'express'
import {
  getRolePermissionsController,
  updateRolePermissionsController,
} from '../controllers/role.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'

const router = Router()

// Role access is itself a permission: only administrators (plus anyone they
// explicitly grant `roles.manage` to) can read or change the matrix.
router.use(authenticateUser, authorizePermission('roles.manage'))
router.get('/permissions', getRolePermissionsController)
router.put('/permissions', updateRolePermissionsController)

export default router
