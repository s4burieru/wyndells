import { toBranchRef, type BranchRef, type BranchRefRow } from './Branch'

export const feedbackTable = 'feedback'

/** Row shape as stored in the Supabase `feedback` table. */
export type FeedbackRow = {
  id: string
  branch_id: string
  customer_name: string
  contact_number: string
  email: string
  rating: number
  comment: string
  reservation_reference: string
  created_at: string
  updated_at: string
}

export type FeedbackWithBranchRow = FeedbackRow & { branch: BranchRefRow }

/** Public summary — never exposes contact information. */
export type FeedbackSummary = {
  _id: string
  customerName: string
  rating: number
  comment: string
  branch: BranchRef
  createdAt: string
}

/** Staff view — includes contact details for follow-ups. */
export type Feedback = FeedbackSummary & {
  contactNumber: string
  email: string
  reservationReference: string
}

export function toFeedbackSummary(row: FeedbackWithBranchRow): FeedbackSummary {
  return {
    _id: row.id,
    customerName: row.customer_name,
    rating: row.rating,
    comment: row.comment,
    branch: toBranchRef(row.branch),
    createdAt: row.created_at,
  }
}

export function toFeedback(row: FeedbackWithBranchRow): Feedback {
  return {
    ...toFeedbackSummary(row),
    contactNumber: row.contact_number,
    email: row.email,
    reservationReference: row.reservation_reference,
  }
}