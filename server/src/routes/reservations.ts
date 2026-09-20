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
import { authenticateUser, authorizeRole } from '../middleware/auth'

const router = Router()

// --- Public (no account needed) ---
router.post('/', createReservationController)
router.get('/slots', getSlotsController)
router.post('/verify', verifyReservationController)
router.post('/:reference/cancel', cancelReservationController)

// --- Staff (admin | manager) ---
router.use(authenticateUser, authorizeRole('admin', 'manager'))
router.get('/', listReservationsController)
router.get('/:id', getReservationController)
router.patch('/:id/status', updateReservationStatusController)
router.patch('/:id/table', assignTableController)

export default router