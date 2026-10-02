import { Router } from 'express'
import {
  assignTableController,
  cancelReservationController,
  createReservationController,
  getReservationController,
  getSlotsController,
  listReservationsController,
  updateReservationStatusController,
  verifyReservationController,
} from '../controllers/reservation.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'

const router = Router()

// --- Public (no account needed) ---
router.post('/', createReservationController)
router.get('/slots', getSlotsController)
router.post('/verify', verifyReservationController)
router.post('/:reference/cancel', cancelReservationController)

// --- Staff with reservation access ---
router.use(authenticateUser, authorizePermission('reservations.manage'))
router.get('/', listReservationsController)
router.get('/:id', getReservationController)
router.patch('/:id/status', updateReservationStatusController)
router.patch('/:id/table', assignTableController)

export default router
