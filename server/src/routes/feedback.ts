import { Router } from 'express'
import {
  createFeedbackController,
  deleteFeedbackController,
  listManageableFeedbackController,
  listPublicFeedbackController,
} from '../controllers/feedback.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'

const router = Router()

// Public — anyone can read published feedback and submit their own.
router.get('/', listPublicFeedbackController)
router.post('/', createFeedbackController)

// Staff — managers see their own branch; admins see everything.
router.get('/manage', authenticateUser, authorizePermission('feedback.view'), listManageableFeedbackController)

// Moderation — admin by default; grantable from Roles & Permissions.
router.delete('/:id', authenticateUser, authorizePermission('feedback.delete'), deleteFeedbackController)

export default router
