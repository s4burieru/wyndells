import { Router } from 'express'
import { overviewController } from '../controllers/report.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'

const router = Router()

// The overview powers both the dashboard landing page and the Reports page,
// so it follows the same toggle an admin flips on the Roles screen.
router.use(authenticateUser, authorizePermission('reports.view'))
router.get('/overview', overviewController)

export default router
