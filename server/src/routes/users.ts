import { Router } from 'express'
import {
  createUserController,
  deleteUserController,
  listUsersController,
  setUserActiveController,
  updateUserController,
} from '../controllers/user.controller'
import { authenticateUser, authorizeRole } from '../middleware/auth'
import { avatarUpload } from '../middleware/uploads'

const router = Router()

router.use(authenticateUser, authorizeRole('admin'))
router.get('/', listUsersController)
// JSON for text-only edits, `multipart/form-data` when a new photo is attached.
router.post('/', avatarUpload.single('avatar'), createUserController)
router.put('/:id', avatarUpload.single('avatar'), updateUserController)
router.patch('/:id/status', setUserActiveController)
router.delete('/:id', deleteUserController)

export default router