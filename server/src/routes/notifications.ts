import { Router } from 'express'
import {
  clearAllNotificationsController,
  deleteNotificationController,
  listNotificationsController,
  markAllReadController,
  markReadController,
  markUnreadController,
  unreadCountController,
} from '../controllers/notification.controller'
import { authenticateUser } from '../middleware/auth'

const router = Router()

// Every route is scoped to the signed-in account; there is no cross-user read.
router.use(authenticateUser)

router.get('/', listNotificationsController)
router.get('/unread-count', unreadCountController)
router.post('/read-all', markAllReadController)
router.patch('/:id/read', markReadController)
router.patch('/:id/unread', markUnreadController)
router.delete('/:id', deleteNotificationController)
router.delete('/', clearAllNotificationsController)

export default router
