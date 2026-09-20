import { createHash } from 'node:crypto'
import { getDb } from '../config/database'
import { feedbackTable, toFeedback, toFeedbackSummary, type FeedbackWithBranchRow } from '../models/Feedback'
import { branchesTable } from '../models/Branch'
import { ApiError } from '../utils/ApiError'
import { assertEmail, assertUuid, assertPhone, requireFields } from '../utils/validate'
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
  const branchId = assertUuid(String(payload.branch), 'branch')
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

  const { data: branch, error: branchError } = await getDb()
    .from(branchesTable)
    .select('id')
    .eq('id', branchId)
    .eq('is_active', true)
    .maybeSingle()
  if (branchError || !branch) {
    throw new ApiError(404, 'The selected branch is not available right now.')
  }

  const { data: created, error } = await getDb()
    .from(feedbackTable)
    .insert({
      branch_id: branchId,
      customer_name: customerName,
      contact_number: contactNumber,
      email,
      rating,
      comment,
      reservation_reference: payload.reservationReference
        ? String(payload.reservationReference).trim().toUpperCase()
        : '',
    })
    .select('id')
    .single()
  if (error) {
    throw new ApiError(500, 'Could not save your feedback. Please try again.')
  }
  return getFeedbackById(created.id)
}

async function getFeedbackById(id: string) {
  const { data, error } = await getDb()
    .from(feedbackTable)
    .select('*, branch:branch_id(id, name, code)')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) {
    throw new ApiError(404, 'Feedback not found')
  }
  return toFeedback(data as FeedbackWithBranchRow)
}

/** Public listing — never exposes contact information. */
export async function listPublicFeedback(branchId?: string, limit = 20) {
  // The inner join lets us filter on the branch so reviews from a deactivated
  // branch no longer appear on the public reviews pages.
  let query = getDb()
    .from(feedbackTable)
    .select('customer_name, rating, comment, created_at, branch:branch_id!inner(id, name, code)')
    .eq('branch.is_active', true)
  if (branchId) {
    query = query.eq('branch_id', assertUuid(branchId, 'branch'))
  }
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50))
  if (error) {
    throw new ApiError(500, 'Could not load feedback.')
  }
  return (data ?? []).map((row) => toFeedbackSummary(row as unknown as FeedbackWithBranchRow))
}

/** Staff listing — includes contact details for follow-ups. */
export async function listManageableFeedback(filter: { branch?: string; limit?: number }) {
  let query = getDb().from(feedbackTable).select('*, branch:branch_id(id, name, code)')
  if (filter.branch) {
    query = query.eq('branch_id', assertUuid(filter.branch, 'branch'))
  }
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 300)
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    throw new ApiError(500, 'Could not load feedback.')
  }
  return (data ?? []).map((row) => toFeedback(row as FeedbackWithBranchRow))
}

export async function deleteFeedback(id: string): Promise<void> {
  assertUuid(id, 'feedback')
  const { data, error } = await getDb().from(feedbackTable).delete().eq('id', id).select('id').single()
  if (error || !data) {
    throw new ApiError(404, 'Feedback not found')
  }
}