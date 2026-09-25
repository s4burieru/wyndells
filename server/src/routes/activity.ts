import { Router } from 'express'
import { listActivityController } from '../controllers/activity.controller'
import { authenticateUser, authorizeRole } from '../middleware/auth'

const router = Router()

// Audit trail of who did what — administrators only.
router.use(authenticateUser, authorizeRole('admin'))
router.get('/', listActivityController)

export default router
