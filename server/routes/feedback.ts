import { Router } from 'express'
import {
  createFeedbackController,
  deleteFeedbackController,
  listManageableFeedbackController,
  listPublicFeedbackController,
} from '../controllers/feedback.controller'
import { authenticateUser, authorizeRole } from '../middleware/auth'

const router = Router()

// Public — anyone can read published feedback and submit their own.
router.get('/', listPublicFeedbackController)
router.post('/', createFeedbackController)

// Staff — managers see their own branch; admins see everything.
router.get('/manage', authenticateUser, authorizeRole('admin', 'manager'), listManageableFeedbackController)

// Moderation — admins only.
router.delete('/:id', authenticateUser, authorizeRole('admin'), deleteFeedbackController)

export default router