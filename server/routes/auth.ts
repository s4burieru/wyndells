import { Router } from 'express'
import { loginController, meController } from '../controllers/auth.controller'
import { authenticateUser } from '../middleware/auth'

const router = Router()

router.post('/login', loginController)
router.get('/me', authenticateUser, meController)

export default router