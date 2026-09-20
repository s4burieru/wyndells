import { Router } from 'express'
import {
  createTableController,
  deleteTableController,
  listTablesController,
  setTableStatusController,
  updateTableController,
} from '../controllers/table.controller'
import { authenticateUser, authorizeRole } from '../middleware/auth'

const router = Router()

router.use(authenticateUser, authorizeRole('admin', 'manager'))
router.get('/', listTablesController)
router.post('/', createTableController)
router.put('/:id', updateTableController)
router.patch('/:id/status', setTableStatusController)
router.delete('/:id', deleteTableController)

export default router