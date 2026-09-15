import { toBranchRef, type BranchRef, type BranchRefRow } from './Branch'
import type { CareerDepartment, PostingStatus } from '../constants'

export const careerPostingsTable = 'career_postings'

/** Row shape as stored in the Supabase `career_postings` table. */
export type CareerPostingRow = {
  id: string
  branch_id: string
  title: string
  department: CareerDepartment
  employment_type: string
  summary: string
  description: string
  requirements: string
  status: PostingStatus
  created_at: string
  updated_at: string
}

export type CareerPostingWithBranchRow = CareerPostingRow & { branch: BranchRefRow }

/** Reference to a posting embedded in other resources (e.g. applications). */
export type CareerPostingRef = { _id: string; title: string; department: CareerDepartment }

/** Public JSON shape — shown on the public careers page. */
export type PublicCareerPosting = {
  _id: string
  branch: BranchRef
  title: string
  department: CareerDepartment
  employmentType: string
  summary: string
  description: string
  requirements: string
  createdAt: string
}

/** Staff JSON shape — includes the moderation status. */
export type CareerPosting = PublicCareerPosting & {
  status: PostingStatus
  updatedAt: string
}

export function toPostingRef(row: Pick<CareerPostingRow, 'id' | 'title' | 'department'>): CareerPostingRef {
  return { _id: row.id, title: row.title, department: row.department }
}

export function toPublicPosting(row: CareerPostingWithBranchRow): PublicCareerPosting {
  return {
    _id: row.id,
    branch: toBranchRef(row.branch),
    title: row.title,
    department: row.department,
    employmentType: row.employment_type,
    summary: row.summary,
    description: row.description,
    requirements: row.requirements,
    createdAt: row.created_at,
  }
}

export function toPosting(row: CareerPostingWithBranchRow): CareerPosting {
  return {
    ...toPublicPosting(row),
    status: row.status,
    updatedAt: row.updated_at,
  }
}