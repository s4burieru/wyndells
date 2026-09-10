import { Router } from 'express'
import {
  createMenuItemController,
  deleteMenuItemController,
  getMenuItemController,
  listMenuItemsController,
  updateMenuItemController,
} from '../controllers/menu.controller'
import { authenticateUser, authorizeRole } from '../middleware/auth'

const router = Router()

// Public read (QR digital menu).
router.get('/', listMenuItemsController)
router.get('/:id', getMenuItemController)

// Management — admins and managers; managers are restricted to their own branch.
router.post('/', authenticateUser, authorizeRole('admin', 'manager'), createMenuItemController)
router.put('/:id', authenticateUser, authorizeRole('admin', 'manager'), updateMenuItemController)
router.delete('/:id', authenticateUser, authorizeRole('admin', 'manager'), deleteMenuItemController)

export default router