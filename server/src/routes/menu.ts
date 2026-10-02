import { Router } from 'express'
import {
  createMenuItemController,
  deleteMenuItemController,
  getMenuItemController,
  listMenuItemsController,
  updateMenuItemController,
} from '../controllers/menu.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'

const router = Router()

// Public read (QR digital menu).
router.get('/', listMenuItemsController)
router.get('/:id', getMenuItemController)

// Management — gated by permission; managers are restricted to their own branch.
router.post('/', authenticateUser, authorizePermission('menu.manage'), createMenuItemController)
router.put('/:id', authenticateUser, authorizePermission('menu.manage'), updateMenuItemController)
router.delete('/:id', authenticateUser, authorizePermission('menu.manage'), deleteMenuItemController)

export default router
