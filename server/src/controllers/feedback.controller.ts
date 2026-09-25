import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  createFeedback,
  deleteFeedback,
  listManageableFeedback,
  listPublicFeedback,
} from '../services/feedback.service'
import { ApiError } from '../utils/ApiError'
import type { AuthedRequest } from '../middleware/auth'

function clientKey(req: Request): string {
  return `${req.ip ?? 'unknown'}|${req.headers['user-agent'] ?? ''}`
}

export const createFeedbackController = asyncHandler(async (req, res) => {
  const feedback = await createFeedback(req.body as Record<string, unknown>, clientKey(req))
  res.status(201).json({ feedback })
})

export const listPublicFeedbackController = asyncHandler(async (req, res) => {
  const branch = req.query.branch ? String(req.query.branch) : undefined
  const items = await listPublicFeedback(branch)
  res.json({ feedback: items })
})

export const listManageableFeedbackController = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    const requested = req.query.branch ? String(req.query.branch) : undefined
    let branch: string | undefined
    if (req.user.role === 'manager') {
      branch = req.user.branch ?? undefined
      if (requested && requested !== branch) {
        throw new ApiError(403, 'You can only view feedback for the branch assigned to you.')
      }
    } else {
      branch = requested
    }
    const items = await listManageableFeedback({ branch })
    res.json({ feedback: items })
  },
)

export const deleteFeedbackController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await deleteFeedback(String(req.params.id), req.user)
  res.json({ message: 'Feedback deleted' })
})