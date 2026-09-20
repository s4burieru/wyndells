import { getDb } from '../config/database'
import { branchesTable, toBranch, type BranchRow } from '../models/Branch'
import { ApiError, isDuplicateKeyError } from '../utils/ApiError'
import { pickFields } from '../utils/pick'
import { assertUuid, isUuid, requireFields } from '../utils/validate'

const BRANCH_EDITABLE_FIELDS = [
  'name',
  'code',
  'address',
  'city',
  'contactNumber',
  'email',
  'hours',
  'description',
  'image',
  'isActive',
]

/** Maps camelCase edit payload fields to their snake_case columns. */
function toRowUpdates(updates: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (updates.name !== undefined) row.name = String(updates.name).trim()
  if (updates.code !== undefined) row.code = String(updates.code).trim().toLowerCase()
  if (updates.address !== undefined) row.address = String(updates.address)
  if (updates.city !== undefined) row.city = String(updates.city)
  if (updates.contactNumber !== undefined) row.contact_number = String(updates.contactNumber)
  if (updates.email !== undefined) row.email = String(updates.email)
  if (updates.hours !== undefined) row.hours = String(updates.hours)
  if (updates.description !== undefined) row.description = String(updates.description)
  if (updates.image !== undefined) row.image = String(updates.image)
  if (updates.isActive !== undefined) row.is_active = Boolean(updates.isActive)
  return row
}

export async function listBranches(includeInactive = false) {
  let query = getDb().from(branchesTable).select('*')
  if (!includeInactive) {
    query = query.eq('is_active', true)
  }
  const { data, error } = await query.order('name')
  if (error) {
    throw new ApiError(500, 'Could not load branches.')
  }
  return (data ?? []).map((row) => toBranch(row as BranchRow))
}

export async function getBranch(idOrCode: string, includeInactive = false) {
  // Accept either a uuid (`/branches/<id>`) or the human-friendly branch
  // code used in public URLs (`/branches/<code>`).
  const lookup = isUuid(idOrCode) ? { field: 'id', value: idOrCode } : { field: 'code', value: String(idOrCode).trim().toLowerCase() }
  let query = getDb().from(branchesTable).select('*')
  if (!includeInactive) {
    // Deactivated branches are hidden from public browsing, matching what the
    // dashboard promises when a branch is switched off.
    query = query.eq('is_active', true)
  }
  const { data, error } = await (lookup.field === 'id'
    ? query.eq('id', lookup.value)
    : query.eq('code', lookup.value)).maybeSingle()
  if (error || !data) {
    throw new ApiError(404, 'Branch not found')
  }
  return toBranch(data as BranchRow)
}

export async function createBranch(payload: Record<string, unknown>) {
  requireFields(payload, ['name', 'code'])
  const updates = pickFields(payload, BRANCH_EDITABLE_FIELDS)
  const code = String(updates.code).trim().toLowerCase()

  const { data: existing } = await getDb().from(branchesTable).select('id').eq('code', code).maybeSingle()
  if (existing) {
    throw new ApiError(409, `A branch with the code "${code}" already exists.`)
  }

  const row = toRowUpdates(updates)
  const { data: created, error } = await getDb().from(branchesTable).insert(row).select('*').single()
  if (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, `A branch with the code "${code}" already exists.`)
    }
    throw new ApiError(500, 'Could not create the branch.')
  }
  return toBranch(created as BranchRow)
}

export async function updateBranch(id: string, payload: Record<string, unknown>) {
  assertUuid(id, 'branch')
  const updates = pickFields(payload, BRANCH_EDITABLE_FIELDS)
  const row = toRowUpdates(updates)

  const { data: updated, error } = await getDb()
    .from(branchesTable)
    .update(row)
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, `A branch with the code "${row.code}" already exists.`)
    }
    throw new ApiError(404, 'Branch not found')
  }
  return toBranch(updated as BranchRow)
}

export async function setBranchActive(id: string, isActive: boolean) {
  assertUuid(id, 'branch')
  const { data: updated, error } = await getDb()
    .from(branchesTable)
    .update({ is_active: isActive })
    .eq('id', id)
    .select('*')
    .single()
  if (error || !updated) {
    throw new ApiError(404, 'Branch not found')
  }
  return toBranch(updated as BranchRow)
}

export async function deleteBranch(id: string): Promise<void> {
  assertUuid(id, 'branch')
  const { data, error } = await getDb().from(branchesTable).delete().eq('id', id).select('id').single()
  if (error || !data) {
    throw new ApiError(404, 'Branch not found')
  }
}