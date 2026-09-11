import { Router } from 'express'
import { overviewController } from '../controllers/report.controller'
import { authenticateUser, authorizeRole } from '../middleware/auth'

const router = Router()

router.use(authenticateUser, authorizeRole('admin', 'manager'))
router.get('/overview', overviewController)

export default router