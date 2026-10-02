import { Router } from 'express'
import { listActivityController } from '../controllers/activity.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'

const router = Router()

// Audit trail of who did what — gated by a toggleable permission so an admin
// can hand it out (HR) or take it away without a code change.
router.use(authenticateUser, authorizePermission('activity.view'))
router.get('/', listActivityController)

export default router
