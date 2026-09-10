import { createHash } from 'node:crypto'
import { FeedbackModel } from '../models/Feedback'
import { BranchModel } from '../models/Branch'
import { ApiError } from '../utils/ApiError'
import { assertEmail, assertObjectId, assertPhone, requireFields } from '../utils/validate'
import { FEEDBACK_MAX_SUBMISSIONS_PER_CLIENT_PER_HOUR } from '../constants'

const FEEDBACK_WINDOW_MS = 60 * 60 * 1000 // one hour
const MAX_FEEDBACK_COMMENT_LENGTH = 1000

/**
 * In-memory per-client submission timestamps used to throttle duplicate
 * feedback. Keys are a hash of the client IP + user agent, so raw IPs are
 * never kept.
 */
const submissionsByClient = new Map<string, number[]>()

function hashClientKey(clientKey: string): string {
  return createHash('sha256').update(clientKey).digest('hex').slice(0, 24)
}

function pruneClientTimestamps(): void {
  const now = Date.now()
  for (const [key, timestamps] of submissionsByClient) {
    const recent = timestamps.filter((timestamp) => now - timestamp < FEEDBACK_WINDOW_MS)
    if (recent.length === 0) {
      submissionsByClient.delete(key)
    } else {
      submissionsByClient.set(key, recent)
    }
  }
  if (submissionsByClient.size > 2000) {
    submissionsByClient.clear()
  }
}

export async function createFeedback(payload: Record<string, unknown>, clientKey: string) {
  const now = Date.now()
  const key = hashClientKey(clientKey)
  const recent = (submissionsByClient.get(key) ?? []).filter(
    (timestamp) => now - timestamp < FEEDBACK_WINDOW_MS,
  )
  if (recent.length >= FEEDBACK_MAX_SUBMISSIONS_PER_CLIENT_PER_HOUR) {
    throw new ApiError(429, 'Thanks for your feedback! Please try again a little later.')
  }
  recent.push(now)
  submissionsByClient.set(key, recent)
  if (submissionsByClient.size % 50 === 0) {
    pruneClientTimestamps()
  }

  requireFields(payload, ['branch', 'customerName', 'rating', 'comment'])
  const branchId = assertObjectId(String(payload.branch), 'branch')
  const rating = Number(payload.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5 stars.')
  }
  const comment = String(payload.comment).trim()
  if (!comment) {
    throw new ApiError(400, 'Please share a short comment with your feedback.')
  }
  if (comment.length > MAX_FEEDBACK_COMMENT_LENGTH) {
    throw new ApiError(400, `Please keep your feedback to ${MAX_FEEDBACK_COMMENT_LENGTH} characters or fewer.`)
  }
  const customerName = String(payload.customerName).trim()
  if (!customerName) {
    throw new ApiError(400, 'Please tell us your name.')
  }

  const contactNumber = payload.contactNumber ? String(payload.contactNumber).trim() : ''
  if (contactNumber) {
    assertPhone(contactNumber)
  }
  const email = payload.email ? String(payload.email).trim().toLowerCase() : ''
  if (email) {
    assertEmail(email, 'email address')
  }

  const branch = await BranchModel.findOne({ _id: branchId, isActive: true }).lean()
  if (!branch) {
    throw new ApiError(404, 'The selected branch is not available right now.')
  }

  const feedback = await FeedbackModel.create({
    branch: branchId,
    customerName,
    contactNumber,
    email,
    rating,
    comment,
    reservationReference: payload.reservationReference
      ? String(payload.reservationReference).trim().toUpperCase()
      : '',
  })
  return FeedbackModel.findById(feedback._id).populate('branch', 'name').lean()
}

/** Public listing — never exposes contact information. */
export async function listPublicFeedback(branchId?: string, limit = 20) {
  const query = branchId ? { branch: assertObjectId(branchId, 'branch') } : {}
  return FeedbackModel.find(query)
    .select('customerName rating comment branch createdAt')
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 50))
    .populate('branch', 'name')
    .lean()
}

/** Staff listing — includes contact details for follow-ups. */
export async function listManageableFeedback(filter: { branch?: string; limit?: number }) {
  const query: Record<string, unknown> = {}
  if (filter.branch) {
    query.branch = assertObjectId(filter.branch, 'branch')
  }
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 300)
  return FeedbackModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('branch', 'name code')
    .lean()
}

export async function deleteFeedback(id: string): Promise<void> {
  assertObjectId(id, 'feedback')
  const feedback = await FeedbackModel.findByIdAndDelete(id)
  if (!feedback) {
    throw new ApiError(404, 'Feedback not found')
  }
}