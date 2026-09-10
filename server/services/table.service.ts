import { DiningTableModel } from '../models/DiningTable'
import { BranchModel } from '../models/Branch'
import { ApiError, isDuplicateKeyError } from '../utils/ApiError'
import { pickFields } from '../utils/pick'
import { assertObjectId, requireFields } from '../utils/validate'
import { TABLE_STATUSES, type TableStatus } from '../constants'
import { assertBranchAccess, type AuthUser } from '../middleware/auth'

const TABLE_EDITABLE_FIELDS = ['tableNumber', 'capacity', 'location', 'status', 'isActive']

/** Scope the query to the actor's own branch when the actor is a manager. */
function scopedBranch(branch: string | undefined, actor: AuthUser): string | undefined {
  if (actor.role === 'manager') {
    const own = actor.branch ?? undefined
    if (branch && branch !== own) {
      throw new ApiError(403, 'You can only manage the branch assigned to you.')
    }
    return own
  }
  return branch
}

async function assertTableBranchAccess(id: string, actor: AuthUser): Promise<void> {
  const match = await DiningTableModel.findById(id).select('branch').lean()
  if (!match) {
    throw new ApiError(404, 'Table not found')
  }
  assertBranchAccess(actor, String(match.branch))
}

export async function listTables(
  options: { branch?: string; includeInactive?: boolean },
  actor: AuthUser,
) {
  const query: Record<string, unknown> = {}
  const branch = scopedBranch(options.branch, actor)
  if (branch) {
    query.branch = assertObjectId(branch, 'branch')
  }
  if (!options.includeInactive) {
    query.isActive = true
  }
  return DiningTableModel.find(query).populate('branch', 'name code').sort({ tableNumber: 1 }).lean()
}

export async function getTable(id: string) {
  assertObjectId(id, 'table')
  const table = await DiningTableModel.findById(id).populate('branch', 'name code').lean()
  if (!table) {
    throw new ApiError(404, 'Table not found')
  }
  return table
}

export async function createTable(payload: Record<string, unknown>, actor: AuthUser) {
  requireFields(payload, ['branch', 'tableNumber', 'capacity'])
  const branchId = assertObjectId(String(payload.branch), 'branch')
  assertBranchAccess(actor, branchId)
  const tableNumber = String(payload.tableNumber).trim()
  const capacity = Number(payload.capacity)
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
    throw new ApiError(400, 'Capacity must be a whole number between 1 and 50.')
  }

  const branch = await BranchModel.exists({ _id: branchId })
  if (!branch) {
    throw new ApiError(400, 'The selected branch does not exist.')
  }

  const updates = pickFields(payload, ['tableNumber', 'capacity', 'location', 'status', 'isActive'])
  updates.branch = branchId
  updates.tableNumber = tableNumber

  try {
    return await DiningTableModel.create(updates)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, 'A table with this number already exists in this branch.')
    }
    throw error
  }
}

export async function updateTable(id: string, payload: Record<string, unknown>, actor: AuthUser) {
  assertObjectId(id, 'table')
  await assertTableBranchAccess(id, actor)
  const updates = pickFields(payload, TABLE_EDITABLE_FIELDS)
  if (updates.capacity !== undefined) {
    const capacity = Number(updates.capacity)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
      throw new ApiError(400, 'Capacity must be a whole number between 1 and 50.')
    }
    updates.capacity = capacity
  }
  if (updates.status !== undefined && !TABLE_STATUSES.includes(updates.status as TableStatus)) {
    throw new ApiError(400, 'Invalid table status.')
  }

  try {
    const table = await DiningTableModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
    if (!table) {
      throw new ApiError(404, 'Table not found')
    }
    return table
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, 'A table with this number already exists in this branch.')
    }
    throw error
  }
}

export async function setTableStatus(id: string, status: string, actor: AuthUser) {
  assertObjectId(id, 'table')
  await assertTableBranchAccess(id, actor)
  if (!TABLE_STATUSES.includes(status as TableStatus)) {
    throw new ApiError(400, 'Invalid table status.')
  }
  const table = await DiningTableModel.findByIdAndUpdate(id, { status }, { new: true })
  if (!table) {
    throw new ApiError(404, 'Table not found')
  }
  return table
}

export async function deleteTable(id: string, actor: AuthUser): Promise<void> {
  assertObjectId(id, 'table')
  await assertTableBranchAccess(id, actor)
  // Deactivating instead of deleting keeps historical reservations intact.
  await DiningTableModel.updateOne({ _id: id }, { isActive: false })
}