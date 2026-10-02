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
import { authenticateUser, authorizePermission } from '../middleware/auth'

const router = Router()

/** Parses `multipart/form-data` application submissions; resumes come as a file. */
const applicationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

// Public — browse open positions and apply.
router.get('/postings', listOpenPostingsController)
router.post('/applications', applicationUpload.single('resume'), submitApplicationController)

// Staff — hiring access comes from Roles & Permissions; managers stay scoped
// to their own branch inside the service layer, HR works across all branches.
router.get('/postings/manage', authenticateUser, authorizePermission('careers.manage'), listPostingsController)
router.post('/postings', authenticateUser, authorizePermission('careers.manage'), createPostingController)
router.put('/postings/:id', authenticateUser, authorizePermission('careers.manage'), updatePostingController)
router.delete('/postings/:id', authenticateUser, authorizePermission('careers.delete'), deletePostingController)

router.get('/applications', authenticateUser, authorizePermission('careers.manage'), listApplicationsController)
router.patch(
  '/applications/:id/status',
  authenticateUser,
  authorizePermission('careers.manage'),
  setApplicationStatusController,
)
router.delete('/applications/:id', authenticateUser, authorizePermission('careers.delete'), deleteApplicationController)

export default router
