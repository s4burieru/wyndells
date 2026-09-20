import { createHash, randomUUID } from 'node:crypto'
import { getDb } from '../config/db'
import {
  careerPostingsTable,
  toPosting,
  toPublicPosting,
  type CareerPosting,
  type CareerPostingWithBranchRow,
  type PublicCareerPosting,
} from '../models/CareerPosting'
import {
  jobApplicationsTable,
  toApplication,
  type JobApplication,
  type JobApplicationWithPostingRow,
} from '../models/JobApplication'
import { branchesTable } from '../models/Branch'
import { ApiError } from '../utils/ApiError'
import { assertEmail, assertPhone, assertUuid, requireFields } from '../utils/validate'
import {
  APPLICATION_STATUSES,
  APPLICATION_TRANSITIONS,
  CAREER_DEPARTMENTS,
  MAX_APPLICATIONS_PER_CLIENT_PER_HOUR,
  MAX_COVER_LETTER_LENGTH,
  POSTING_STATUSES,
  type ApplicationStatus,
  type CareerDepartment,
  type PostingStatus,
} from '../constants'
import { assertBranchAccess, type AuthUser } from '../middleware/auth'

const APPLICATION_WINDOW_MS = 60 * 60 * 1000 // one hour

/** Resume uploads: public Supabase Storage bucket, PDF / DOC / DOCX, max 5 MB. */
const RESUME_BUCKET = 'resumes'
const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_RESUME_EXTENSIONS = new Set(['pdf', 'doc', 'docx'])
const RESUME_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

/** A file received by multer's memory storage (matches Express.Multer.File). */
export type ResumeUpload = {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

/** Selects that embed related rows (mirrors mongoose `.populate`). */
const POSTING_SELECT = '*, branch:branch_id(id, name, code)'
const APPLICATION_SELECT = '*, posting:posting_id(*, branch:branch_id(id, name, code))'

/**
 * In-memory per-client submission timestamps used to throttle duplicate
 * applications. Keys are a hash of the client IP + user agent, so raw IPs are
 * never kept (same approach as feedback).
 */
const submissionsByClient = new Map<string, number[]>()

function hashClientKey(clientKey: string): string {
  return createHash('sha256').update(clientKey).digest('hex').slice(0, 24)
}

function pruneClientTimestamps(): void {
  const now = Date.now()
  for (const [key, timestamps] of submissionsByClient) {
    const recent = timestamps.filter((timestamp) => now - timestamp < APPLICATION_WINDOW_MS)
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

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Open postings shown on the public careers page, newest first. */
export async function listOpenPostings(branchId?: string): Promise<PublicCareerPosting[]> {
  let query = getDb()
    .from(careerPostingsTable)
    .select(POSTING_SELECT)
    .eq('status', 'open')
  if (branchId) {
    query = query.eq('branch_id', assertUuid(branchId, 'branch'))
  }
  const { data, error } = await query.order('created_at', { ascending: false }).limit(100)
  if (error) {
    throw new ApiError(500, 'Could not load open positions.')
  }
  return (data ?? []).map((row) => toPublicPosting(row as unknown as CareerPostingWithBranchRow))
}

function assertDepartment(value: string): CareerDepartment {
  if (!CAREER_DEPARTMENTS.includes(value as CareerDepartment)) {
    throw new ApiError(400, 'Department must be either "restaurant" or "cafe".')
  }
  return value as CareerDepartment
}

function assertPostingStatus(value: string): PostingStatus {
  if (!POSTING_STATUSES.includes(value as PostingStatus)) {
    throw new ApiError(400, 'Status must be either "open" or "closed".')
  }
  return value as PostingStatus
}

function assertApplicationStatus(value: string): ApplicationStatus {
  if (!APPLICATION_STATUSES.includes(value as ApplicationStatus)) {
    throw new ApiError(400, 'That application status is not recognised.')
  }
  return value as ApplicationStatus
}

function resumeExtension(upload: ResumeUpload): string {
  const ext = upload.originalname.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_RESUME_EXTENSIONS.has(ext)) {
    throw new ApiError(400, 'Please upload your resume as a PDF, DOC, or DOCX file.')
  }
  // Reject mismatched types when the browser reported a specific type.
  const reportedType = upload.mimetype.toLowerCase()
  const expectedType = RESUME_MIME_BY_EXTENSION[ext]
  if (reportedType && reportedType !== 'application/octet-stream' && expectedType && reportedType !== expectedType) {
    throw new ApiError(
      400,
      `The chosen file does not look like a ${ext.toUpperCase()} document. Please upload your resume as a PDF, DOC, or DOCX file.`,
    )
  }
  return `.${ext}`
}

/** Creates the public resumes bucket on first use (safe to call repeatedly). */
async function ensureResumeBucket(): Promise<void> {
  const { error } = await getDb().storage.createBucket(RESUME_BUCKET, { public: true })
  if (!error) {
    return
  }
  const message = String(error.message ?? (error as { code?: unknown }).code ?? '')
  if (!/already exists|duplicate/i.test(message)) {
    throw new ApiError(500, 'Resume storage is not available right now. Please try again later.')
  }
}

/** Uploads a resume to Supabase Storage and returns its public URL. */
async function uploadResume(upload: ResumeUpload): Promise<string> {
  const extension = resumeExtension(upload)
  await ensureResumeBucket()
  const path = `applications/${randomUUID()}${extension}`
  const contentType = RESUME_MIME_BY_EXTENSION[extension.slice(1)] ?? 'application/octet-stream'
  const { error } = await getDb()
    .storage
    .from(RESUME_BUCKET)
    .upload(path, upload.buffer, { contentType, upsert: false })
  if (error) {
    throw new ApiError(500, 'Could not save your resume. Please try again.')
  }
  const { data } = getDb().storage.from(RESUME_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** Removes a resume file after a failed application so orphan files stay out of storage. */
async function deleteResumeIfAny(resumeUrl: string): Promise<void> {
  if (!resumeUrl) {
    return
  }
  const marker = `/object/public/${RESUME_BUCKET}/`
  const index = resumeUrl.indexOf(marker)
  if (index === -1) {
    return
  }
  const path = resumeUrl.slice(index + marker.length)
  if (path) {
    await getDb().storage.from(RESUME_BUCKET).remove([path])
  }
}

export async function createApplication(
  payload: Record<string, unknown>,
  resume: ResumeUpload | undefined,
  clientKey: string,
): Promise<JobApplication> {
  const now = Date.now()
  const key = hashClientKey(clientKey)
  const recent = (submissionsByClient.get(key) ?? []).filter(
    (timestamp) => now - timestamp < APPLICATION_WINDOW_MS,
  )
  if (recent.length >= MAX_APPLICATIONS_PER_CLIENT_PER_HOUR) {
    throw new ApiError(429, 'Thanks for your interest! Please wait a little before applying again.')
  }
  recent.push(now)
  submissionsByClient.set(key, recent)
  if (submissionsByClient.size % 50 === 0) {
    pruneClientTimestamps()
  }

  requireFields(payload, ['postingId', 'fullName', 'email', 'contactNumber'])
  const postingId = assertUuid(String(payload.postingId), 'posting')

  const fullName = String(payload.fullName).trim()
  if (!fullName) {
    throw new ApiError(400, 'Please tell us your full name.')
  }
  const email = String(payload.email).trim().toLowerCase()
  assertEmail(email, 'email address')

  const contactNumber = String(payload.contactNumber).trim()
  assertPhone(contactNumber, 'mobile number')

  const coverLetter = payload.coverLetter ? String(payload.coverLetter).trim() : ''
  if (coverLetter.length > MAX_COVER_LETTER_LENGTH) {
    throw new ApiError(400, `Please keep your introduction to ${MAX_COVER_LETTER_LENGTH} characters or fewer.`)
  }

  if (!resume || !resume.buffer) {
    throw new ApiError(400, 'Please attach your resume as a PDF, DOC, or DOCX file.')
  }
  if (resume.size > MAX_RESUME_SIZE_BYTES) {
    throw new ApiError(413, 'The resume file is too large. Please upload a PDF, DOC, or DOCX up to 5 MB.')
  }

  // Applications are only accepted for an open posting of an active branch.
  const { data: posting, error: postingError } = await getDb()
    .from(careerPostingsTable)
    .select('id, branch_id, status')
    .eq('id', postingId)
    .eq('status', 'open')
    .maybeSingle()
  if (postingError || !posting) {
    throw new ApiError(404, 'This position is no longer accepting applications.')
  }
  const { data: branch, error: branchError } = await getDb()
    .from(branchesTable)
    .select('id')
    .eq('id', String(posting.branch_id))
    .eq('is_active', true)
    .maybeSingle()
  if (branchError || !branch) {
    throw new ApiError(404, 'The branch for this position is not available right now.')
  }

  const { data: created, error } = await getDb()
    .from(jobApplicationsTable)
    .insert({
      posting_id: postingId,
      full_name: fullName,
      email,
      contact_number: contactNumber,
      cover_letter: coverLetter,
    })
    .select('id')
    .single()
  if (error) {
    throw new ApiError(500, 'Could not save your application. Please try again.')
  }

  // Upload the resume to Supabase Storage, then attach its public URL. If any
  // step fails, roll the application back so no partial records are left.
  let resumeUrl = ''
  try {
    resumeUrl = await uploadResume(resume)
    const { error: updateError } = await getDb()
      .from(jobApplicationsTable)
      .update({ resume_url: resumeUrl })
      .eq('id', created.id)
    if (updateError) {
      throw new ApiError(500, 'Could not save your resume. Please try again.')
    }
  } catch (reason) {
    await deleteResumeIfAny(resumeUrl)
    await getDb().from(jobApplicationsTable).delete().eq('id', created.id)
    throw reason
  }

  return getApplicationById(created.id)
}

async function getApplicationById(id: string): Promise<JobApplication> {
  const { data, error } = await getDb()
    .from(jobApplicationsTable)
    .select(APPLICATION_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) {
    throw new ApiError(404, 'Application not found')
  }
  return toApplication(data as unknown as JobApplicationWithPostingRow)
}

// ---------------------------------------------------------------------------
// Staff — postings
// ---------------------------------------------------------------------------

/** Branch-scoped postings for the dashboard (includes closed positions). */
export async function listPostingsForStaff(actor: AuthUser, requestedBranch?: string): Promise<CareerPosting[]> {
  if (requestedBranch) {
    assertBranchAccess(actor, requestedBranch)
  }
  const branch = requestedBranch || (actor.role === 'manager' ? actor.branch ?? undefined : undefined)
  let query = getDb().from(careerPostingsTable).select(POSTING_SELECT)
  if (branch) {
    query = query.eq('branch_id', branch)
  }
  const { data, error } = await query.order('created_at', { ascending: false }).limit(200)
  if (error) {
    throw new ApiError(500, 'Could not load positions.')
  }
  return (data ?? []).map((row) => toPosting(row as unknown as CareerPostingWithBranchRow))
}

export async function createPosting(payload: Record<string, unknown>, actor: AuthUser): Promise<CareerPosting> {
  requireFields(payload, ['branch', 'title', 'department', 'status'])
  const branchId = assertUuid(String(payload.branch), 'branch')
  assertBranchAccess(actor, branchId)

  const title = String(payload.title).trim()
  if (!title) {
    throw new ApiError(400, 'Please provide a position title.')
  }
  const department = assertDepartment(String(payload.department))
  const status = assertPostingStatus(String(payload.status))

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
    .from(careerPostingsTable)
    .insert({
      branch_id: branchId,
      title,
      department,
      employment_type: (payload.employmentType ? String(payload.employmentType).trim() : 'Full-time') || 'Full-time',
      summary: payload.summary ? String(payload.summary).trim() : '',
      description: payload.description ? String(payload.description).trim() : '',
      requirements: payload.requirements ? String(payload.requirements).trim() : '',
      status,
    })
    .select('id')
    .single()
  if (error) {
    throw new ApiError(500, 'Could not create the position.')
  }
  return getPostingById(created.id)
}

export async function updatePosting(id: string, payload: Record<string, unknown>, actor: AuthUser): Promise<CareerPosting> {
  assertUuid(id, 'posting')
  const existing = await getPostingById(id)
  assertBranchAccess(actor, existing.branch._id)

  if (payload.branch !== undefined) {
    assertBranchAccess(actor, String(payload.branch))
  }

  const rowUpdates: Record<string, unknown> = {}
  if (payload.branch !== undefined) {
    rowUpdates.branch_id = assertUuid(String(payload.branch), 'branch')
  }
  if (payload.title !== undefined) {
    const title = String(payload.title).trim()
    if (!title) {
      throw new ApiError(400, 'Please provide a position title.')
    }
    rowUpdates.title = title
  }
  if (payload.department !== undefined) {
    rowUpdates.department = assertDepartment(String(payload.department))
  }
  if (payload.employmentType !== undefined) {
    rowUpdates.employment_type = String(payload.employmentType).trim() || 'Full-time'
  }
  if (payload.summary !== undefined) {
    rowUpdates.summary = String(payload.summary).trim()
  }
  if (payload.description !== undefined) {
    rowUpdates.description = String(payload.description).trim()
  }
  if (payload.requirements !== undefined) {
    rowUpdates.requirements = String(payload.requirements).trim()
  }
  if (payload.status !== undefined) {
    rowUpdates.status = assertPostingStatus(String(payload.status))
  }

  if (Object.keys(rowUpdates).length === 0) {
    return existing
  }
  const { error } = await getDb().from(careerPostingsTable).update(rowUpdates).eq('id', id)
  if (error) {
    throw new ApiError(500, 'Could not update the position.')
  }
  return getPostingById(id)
}

export async function deletePosting(id: string): Promise<void> {
  assertUuid(id, 'posting')
  const { data, error } = await getDb().from(careerPostingsTable).delete().eq('id', id).select('id').single()
  if (error || !data) {
    throw new ApiError(404, 'Position not found')
  }
}

async function getPostingById(id: string): Promise<CareerPosting> {
  const { data, error } = await getDb()
    .from(careerPostingsTable)
    .select(POSTING_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) {
    throw new ApiError(404, 'Position not found')
  }
  return toPosting(data as unknown as CareerPostingWithBranchRow)
}

// ---------------------------------------------------------------------------
// Staff — applications
// ---------------------------------------------------------------------------

/** Posting ids the actor may manage, scoped to the manager's branch. */
async function scopedPostingIds(actor: AuthUser, requestedBranch?: string, requestedPosting?: string): Promise<string[]> {
  let query = getDb().from(careerPostingsTable).select('id')
  if (actor.role === 'manager') {
    query = query.eq('branch_id', actor.branch!)
  } else if (requestedBranch) {
    assertBranchAccess(actor, requestedBranch)
    query = query.eq('branch_id', requestedBranch)
  }
  if (requestedPosting) {
    query = query.eq('id', assertUuid(requestedPosting, 'posting'))
  }
  const { data, error } = await query.limit(500)
  if (error) {
    throw new ApiError(500, 'Could not load applications.')
  }
  const ids = (data ?? []).map((row) => String(row.id))
  // A manager may only query postings that actually belong to their branch.
  if (requestedPosting && actor.role === 'manager' && !ids.includes(requestedPosting)) {
    throw new ApiError(403, 'You can only view applications for the branch assigned to you.')
  }
  return ids
}

export async function listApplications(
  actor: AuthUser,
  filter: { branch?: string; posting?: string; limit?: number },
): Promise<JobApplication[]> {
  const postingIds = await scopedPostingIds(actor, filter.branch, filter.posting)
  if (postingIds.length === 0) {
    return []
  }
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 300)
  const { data, error } = await getDb()
    .from(jobApplicationsTable)
    .select(APPLICATION_SELECT)
    .in('posting_id', postingIds)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    throw new ApiError(500, 'Could not load applications.')
  }
  return (data ?? []).map((row) => toApplication(row as unknown as JobApplicationWithPostingRow))
}

/** Verifies the actor may manage the application (branch access via its posting). */
async function assertApplicationAccess(id: string, actor: AuthUser): Promise<JobApplication> {
  const application = await getApplicationById(id)
  if (actor.role === 'manager' && application.branch._id !== actor.branch) {
    throw new ApiError(403, 'You can only manage applications for the branch assigned to you.')
  }
  return application
}

export async function setApplicationStatus(
  id: string,
  status: string,
  actor: AuthUser,
): Promise<JobApplication> {
  const application = await assertApplicationAccess(id, actor)
  const nextStatus = assertApplicationStatus(status)
  // Allowed transitions are enforced so the pipeline stays tidy.
  const previous = application.status
  if (previous !== nextStatus && !APPLICATION_TRANSITIONS[previous].includes(nextStatus)) {
    throw new ApiError(400, `Applications cannot move from "${previous}" straight to "${nextStatus}".`)
  }
  const { error } = await getDb().from(jobApplicationsTable).update({ status: nextStatus }).eq('id', id)
  if (error) {
    throw new ApiError(500, 'Could not update the application status.')
  }
  return getApplicationById(id)
}

export async function deleteApplication(id: string): Promise<void> {
  assertUuid(id, 'application')
  const { data, error } = await getDb().from(jobApplicationsTable).delete().eq('id', id).select('id').single()
  if (error || !data) {
    throw new ApiError(404, 'Application not found')
  }
}