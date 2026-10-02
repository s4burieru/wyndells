import { Router } from 'express'
import { getStaffController, listStaffController } from '../controllers/user.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'

/**
 * Staff directory — anyone holding `directory.view` may browse approved
 * work-related profiles (a single profile stays readable for every signed-in
 * staff member, because the Users & Managers page links to it too). Account
 * management (create/edit/deactivate) stays under `/api/users`.
 */
const router = Router()

router.use(authenticateUser)
router.get('/', authorizePermission('directory.view'), listStaffController)
router.get('/:id', getStaffController)

export default router
