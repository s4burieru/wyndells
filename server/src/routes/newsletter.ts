import { Router } from 'express'
import {
  deleteSubscriberController,
  listSubscribersController,
  subscribeNewsletterController,
} from '../controllers/newsletter.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'

const router = Router()

// Public — sign up from the home-page section or the timed popup.
router.post('/', subscribeNewsletterController)

// Staff — the Customers screen; administrators by default, grantable from
// Settings → Roles & Permissions.
router.get('/manage', authenticateUser, authorizePermission('customers.view'), listSubscribersController)
router.delete('/:id', authenticateUser, authorizePermission('customers.delete'), deleteSubscriberController)

export default router
