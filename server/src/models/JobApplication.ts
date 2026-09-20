import { toPostingRef, type CareerPostingRef, type CareerPostingRow } from './CareerPosting'
import { toBranchRef, type BranchRef, type BranchRefRow } from './Branch'
import type { ApplicationStatus } from '../constants'

export const jobApplicationsTable = 'job_applications'

/** Row shape as stored in the Supabase `job_applications` table. */
export type JobApplicationRow = {
  id: string
  posting_id: string
  full_name: string
  email: string
  contact_number: string
  cover_letter: string
  resume_url: string
  status: ApplicationStatus
  notes: string
  created_at: string
  updated_at: string
}

export type JobApplicationWithPostingRow = JobApplicationRow & {
  posting: CareerPostingRow & { branch: BranchRefRow }
}

/** Staff JSON shape — includes the embedded posting reference for inbox views. */
export type JobApplication = {
  _id: string
  posting: CareerPostingRef
  branch: BranchRef
  fullName: string
  email: string
  contactNumber: string
  coverLetter: string
  resumeUrl: string
  status: ApplicationStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export function toApplication(row: JobApplicationWithPostingRow): JobApplication {
  return {
    _id: row.id,
    posting: toPostingRef(row.posting),
    branch: toBranchRef(row.posting.branch),
    fullName: row.full_name,
    email: row.email,
    contactNumber: row.contact_number,
    coverLetter: row.cover_letter,
    resumeUrl: row.resume_url,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}