import { Router } from 'express'
import {
  createUserController,
  deleteUserController,
  listUsersController,
  setUserActiveController,
  updateUserController,
} from '../controllers/user.controller'
import { authenticateUser, authorizeRole } from '../middleware/auth'

const router = Router()

router.use(authenticateUser, authorizeRole('admin'))
router.get('/', listUsersController)
router.post('/', createUserController)
router.put('/:id', updateUserController)
router.patch('/:id/status', setUserActiveController)
router.delete('/:id', deleteUserController)

export default router