import { Router } from 'express'
import {
  createBranchController,
  deleteBranchController,
  getBranchController,
  listBranchesController,
  setBranchActiveController,
  updateBranchController,
} from '../controllers/branch.controller'
import { authenticateUser, authorizeRole } from '../middleware/auth'

const router = Router()

// Public browse.
router.get('/', listBranchesController)
router.get('/:id', getBranchController)

// Administration.
router.post('/', authenticateUser, authorizeRole('admin'), createBranchController)
router.put('/:id', authenticateUser, authorizeRole('admin'), updateBranchController)
router.patch('/:id/status', authenticateUser, authorizeRole('admin'), setBranchActiveController)
router.delete('/:id', authenticateUser, authorizeRole('admin'), deleteBranchController)

export default router