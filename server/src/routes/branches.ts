import { Router } from 'express'
import {
  createBranchController,
  deleteBranchController,
  getBranchController,
  listBranchesController,
  setBranchActiveController,
  updateBranchController,
} from '../controllers/branch.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'

const router = Router()

// Public browse.
router.get('/', listBranchesController)
router.get('/:id', getBranchController)

// Administration.
router.post('/', authenticateUser, authorizePermission('branches.manage'), createBranchController)
router.put('/:id', authenticateUser, authorizePermission('branches.manage'), updateBranchController)
router.patch('/:id/status', authenticateUser, authorizePermission('branches.manage'), setBranchActiveController)
router.delete('/:id', authenticateUser, authorizePermission('branches.manage'), deleteBranchController)

export default router
