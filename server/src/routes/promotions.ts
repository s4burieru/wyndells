import { Router } from 'express'
import multer from 'multer'
import {
  createPromotionController,
  deletePromotionController,
  listManageablePromotionsController,
  listPublicPromotionsController,
  updatePromotionController,
} from '../controllers/promotion.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'
import { MAX_PROMOTION_IMAGE_FILE_SIZE_BYTES } from '../services/promotionImage.service'

const router = Router()

/**
 * Parses `multipart/form-data` promotion saves. The card photo is the
 * `promotionImage` field (distinct from the group-photo `image` field so the
 * shared multer error handler can quote the right size limit — 4 MB here).
 * The clear-photo marker stays a plain `image` text field in the body.
 */
const promotionImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROMOTION_IMAGE_FILE_SIZE_BYTES },
})

// Public — published promotions inside their visibility window (home page).
router.get('/', listPublicPromotionsController)

// Management — gated by permission; managers are restricted to their own branch.
router.get(
  '/manage',
  authenticateUser,
  authorizePermission('promotions.manage'),
  listManageablePromotionsController,
)
router.post(
  '/',
  authenticateUser,
  authorizePermission('promotions.manage'),
  promotionImageUpload.single('promotionImage'),
  createPromotionController,
)
router.put(
  '/:id',
  authenticateUser,
  authorizePermission('promotions.manage'),
  promotionImageUpload.single('promotionImage'),
  updatePromotionController,
)
router.delete('/:id', authenticateUser, authorizePermission('promotions.manage'), deletePromotionController)

export default router
