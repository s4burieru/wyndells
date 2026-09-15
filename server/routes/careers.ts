import { Router } from 'express'
import multer from 'multer'
import {
  createPostingController,
  deleteApplicationController,
  deletePostingController,
  listApplicationsController,
  listOpenPostingsController,
  listPostingsController,
  setApplicationStatusController,
  submitApplicationController,
  updatePostingController,
} from '../controllers/career.controller'
import { authenticateUser, authorizeRole } from '../middleware/auth'

const router = Router()

/** Parses `multipart/form-data` application submissions; resumes come as a file. */
const applicationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

// Public — browse open positions and apply.
router.get('/postings', listOpenPostingsController)
router.post('/applications', applicationUpload.single('resume'), submitApplicationController)

// Staff — managers manage their own branch; admins manage everything.
router.get('/postings/manage', authenticateUser, authorizeRole('admin', 'manager'), listPostingsController)
router.post('/postings', authenticateUser, authorizeRole('admin', 'manager'), createPostingController)
router.put('/postings/:id', authenticateUser, authorizeRole('admin', 'manager'), updatePostingController)
router.delete('/postings/:id', authenticateUser, authorizeRole('admin'), deletePostingController)

router.get('/applications', authenticateUser, authorizeRole('admin', 'manager'), listApplicationsController)
router.patch(
  '/applications/:id/status',
  authenticateUser,
  authorizeRole('admin', 'manager'),
  setApplicationStatusController,
)
router.delete('/applications/:id', authenticateUser, authorizeRole('admin'), deleteApplicationController)

export default router