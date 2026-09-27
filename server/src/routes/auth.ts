import { Router } from 'express'
import {
  googleLoginController,
  loginController,
  meController,
  updateProfileController,
} from '../controllers/auth.controller'
import { authenticateUser } from '../middleware/auth'
import { avatarUpload } from '../middleware/uploads'

const router = Router()

router.post('/login', loginController)
// Google OAuth: verifies the Google identity, then authorizes it against the
// staff table. Unknown Google accounts are rejected — never registered.
router.post('/google', googleLoginController)
router.get('/me', authenticateUser, meController)
// JSON for text-only edits, `multipart/form-data` when a new photo is attached.
router.patch('/me', authenticateUser, avatarUpload.single('avatar'), updateProfileController)

export default router