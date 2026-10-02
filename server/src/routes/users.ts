import { Router } from 'express'
import {
  createUserController,
  deleteUserController,
  listUsersController,
  setUserActiveController,
  updateUserController,
} from '../controllers/user.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'
import { avatarUpload } from '../middleware/uploads'

const router = Router()

router.use(authenticateUser)
// Reading the account list is separate from changing it, so HR can be granted
// a read-only view while `users.manage` stays with administrators.
router.get('/', authorizePermission('users.view'), listUsersController)
// JSON for text-only edits, `multipart/form-data` when a new photo is attached.
router.post('/', authorizePermission('users.manage'), avatarUpload.single('avatar'), createUserController)
router.put('/:id', authorizePermission('users.manage'), avatarUpload.single('avatar'), updateUserController)
router.patch('/:id/status', authorizePermission('users.manage'), setUserActiveController)
router.delete('/:id', authorizePermission('users.manage'), deleteUserController)

export default router
