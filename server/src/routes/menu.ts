import { Router } from 'express'
import multer from 'multer'
import {
  createMenuItemController,
  deleteMenuItemController,
  getMenuItemController,
  listMenuItemsController,
  updateMenuItemController,
} from '../controllers/menu.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'
import { MAX_MENU_IMAGE_FILE_SIZE_BYTES } from '../services/menuImage.service'

const router = Router()

/**
 * Parses `multipart/form-data` menu saves. The dish photo is the `menuImage`
 * field (distinct from the `image` text field so the shared multer error
 * handler can quote the right size limit — 4 MB here). The clear-photo marker
 * stays a plain `image` text field in the body.
 */
const menuImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MENU_IMAGE_FILE_SIZE_BYTES },
})

// Public read (QR digital menu).
router.get('/', listMenuItemsController)
router.get('/:id', getMenuItemController)

// Management — gated by permission; managers are restricted to their own branch.
router.post('/', authenticateUser, authorizePermission('menu.manage'), menuImageUpload.single('menuImage'), createMenuItemController)
router.put('/:id', authenticateUser, authorizePermission('menu.manage'), menuImageUpload.single('menuImage'), updateMenuItemController)
router.delete('/:id', authenticateUser, authorizePermission('menu.manage'), deleteMenuItemController)

export default router
