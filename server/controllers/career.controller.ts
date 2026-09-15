import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  createApplication,
  createPosting,
  deleteApplication,
  deletePosting,
  listApplications,
  listOpenPostings,
  listPostingsForStaff,
  setApplicationStatus,
  updatePosting,
  type ResumeUpload,
} from '../services/career.service'
import { ApiError } from '../utils/ApiError'
import type { AuthedRequest } from '../middleware/auth'

function clientKey(req: Request): string {
  return `${req.ip ?? 'unknown'}|${req.headers['user-agent'] ?? ''}`
}

// Public ----------------------------------------------------------------

export const listOpenPostingsController = asyncHandler(async (req: Request, res: Response) => {
  const branch = req.query.branch ? String(req.query.branch) : undefined
  const postings = await listOpenPostings(branch)
  res.json({ postings })
})

export const submitApplicationController = asyncHandler(async (req: Request, res: Response) => {
  // `resume` is the multer-parsed file attached by the multipart middleware.
  const file = (req as Request & { file?: ResumeUpload }).file
  const application = await createApplication(req.body as Record<string, unknown>, file, clientKey(req))
  res.status(201).json({ application })
})

// Staff — postings ------------------------------------------------------

export const listPostingsController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const branch = req.query.branch ? String(req.query.branch) : undefined
  const postings = await listPostingsForStaff(req.user, branch)
  res.json({ postings })
})

export const createPostingController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const posting = await createPosting(req.body as Record<string, unknown>, req.user)
  res.status(201).json({ posting })
})

export const updatePostingController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const posting = await updatePosting(String(req.params.id), req.body as Record<string, unknown>, req.user)
  res.json({ posting })
})

export const deletePostingController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await deletePosting(String(req.params.id))
  res.json({ message: 'Position deleted' })
})

// Staff — applications --------------------------------------------------

export const listApplicationsController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const branch = req.query.branch ? String(req.query.branch) : undefined
  const posting = req.query.posting ? String(req.query.posting) : undefined
  const applications = await listApplications(req.user, { branch, posting })
  res.json({ applications })
})

export const setApplicationStatusController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const status = String(req.body?.status ?? '')
  if (!status) {
    throw new ApiError(400, 'A status is required.')
  }
  const application = await setApplicationStatus(String(req.params.id), status, req.user)
  res.json({ application })
})

export const deleteApplicationController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await deleteApplication(String(req.params.id))
  res.json({ message: 'Application deleted' })
})