import { getDb } from '../config/database'
import { diningTablesTable, toDiningTable, toDiningTableWithBranch, type DiningTableRow, type DiningTableWithBranchRow } from '../models/DiningTable'
import { branchesTable } from '../models/Branch'
import { ApiError, isDuplicateKeyError } from '../utils/ApiError'
import { pickFields } from '../utils/pick'
import { assertUuid, requireFields } from '../utils/validate'
import { TABLE_STATUSES, type TableStatus } from '../constants'
import { assertBranchAccess, type AuthUser } from '../middleware/auth'
import { recordActivity } from './activity.service'

const TABLE_EDITABLE_FIELDS = ['tableNumber', 'capacity', 'location', 'status', 'isActive']

/** Select used for reads that embed the branch reference (mirrors mongoose `.populate`). */
const TABLE_SELECT = '*, branch:branch_id(id, name, code)'

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

async function assertTableBranchAccess(id: string, actor: AuthUser): Promise<string> {
  const { data: match, error } = await getDb()
    .from(diningTablesTable)
    .select('branch_id')
    .eq('id', id)
    .maybeSingle()
  if (error || !match) {
    throw new ApiError(404, 'Table not found')
  }
  assertBranchAccess(actor, String(match.branch_id))
  return String(match.branch_id)
}

export async function listTables(
  options: { branch?: string; includeInactive?: boolean },
  actor: AuthUser,
) {
  let query = getDb().from(diningTablesTable).select(TABLE_SELECT)
  const branch = scopedBranch(options.branch, actor)
  if (branch) {
    query = query.eq('branch_id', assertUuid(branch, 'branch'))
  }
  if (!options.includeInactive) {
    query = query.eq('is_active', true)
  }
  const { data, error } = await query.order('table_number')
  if (error) {
    throw new ApiError(500, 'Could not load tables.')
  }
  return (data ?? []).map((row) => toDiningTableWithBranch(row as DiningTableWithBranchRow))
}

export async function getTable(id: string) {
  assertUuid(id, 'table')
  const { data: table, error } = await getDb()
    .from(diningTablesTable)
    .select(TABLE_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error || !table) {
    throw new ApiError(404, 'Table not found')
  }
  return toDiningTableWithBranch(table as DiningTableWithBranchRow)
}

export async function createTable(payload: Record<string, unknown>, actor: AuthUser) {
  requireFields(payload, ['branch', 'tableNumber', 'capacity'])
  const branchId = assertUuid(String(payload.branch), 'branch')
  assertBranchAccess(actor, branchId)
  const tableNumber = String(payload.tableNumber).trim()
  const capacity = Number(payload.capacity)
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
    throw new ApiError(400, 'Capacity must be a whole number between 1 and 50.')
  }

  const { data: branch, error: branchError } = await getDb()
    .from(branchesTable)
    .select('id')
    .eq('id', branchId)
    .maybeSingle()
  if (branchError || !branch) {
    throw new ApiError(400, 'The selected branch does not exist.')
  }

  const updates = pickFields(payload, ['tableNumber', 'capacity', 'location', 'status', 'isActive'])
  const { data: created, error } = await getDb()
    .from(diningTablesTable)
    .insert({
      branch_id: branchId,
      table_number: tableNumber,
      capacity,
      location: updates.location === undefined ? 'Main Hall' : String(updates.location),
      status: updates.status === undefined ? 'available' : String(updates.status),
      is_active: updates.isActive === undefined ? true : Boolean(updates.isActive),
    })
    .select('*')
    .single()
  if (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, 'A table with this number already exists in this branch.')
    }
    throw new ApiError(500, 'Could not create the table.')
  }
  void recordActivity({
    actorId: actor.id,
    branchId,
    action: 'table.created',
    summary: `Table ${tableNumber} (seats ${capacity}) was added`,
    entity: 'table',
    entityId: String(created.id),
  })
  return toDiningTable(created as DiningTableRow)
}

export async function updateTable(id: string, payload: Record<string, unknown>, actor: AuthUser) {
  assertUuid(id, 'table')
  const branchId = await assertTableBranchAccess(id, actor)
  const updates = pickFields(payload, TABLE_EDITABLE_FIELDS)

  const row: Record<string, unknown> = {}
  if (updates.tableNumber !== undefined) row.table_number = String(updates.tableNumber).trim()
  if (updates.location !== undefined) row.location = String(updates.location)
  if (updates.isActive !== undefined) row.is_active = Boolean(updates.isActive)
  if (updates.capacity !== undefined) {
    const capacity = Number(updates.capacity)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
      throw new ApiError(400, 'Capacity must be a whole number between 1 and 50.')
    }
    row.capacity = capacity
  }
  if (updates.status !== undefined) {
    if (!TABLE_STATUSES.includes(updates.status as TableStatus)) {
      throw new ApiError(400, 'Invalid table status.')
    }
    row.status = updates.status
  }

  const { data: updated, error } = await getDb()
    .from(diningTablesTable)
    .update(row)
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, 'A table with this number already exists in this branch.')
    }
    throw new ApiError(404, 'Table not found')
  }
  const changed = Object.keys(updates)
  if (changed.length > 0) {
    void recordActivity({
      actorId: actor.id,
      branchId,
      action: changed.length === 1 && changed[0] === 'status' ? 'table.status_changed' : 'table.updated',
      summary: `Table ${updated.table_number} was updated (${changed.join(', ')})`,
      entity: 'table',
      entityId: id,
    })
  }
  return toDiningTable(updated as DiningTableRow)
}

export async function setTableStatus(id: string, status: string, actor: AuthUser) {
  assertUuid(id, 'table')
  const branchId = await assertTableBranchAccess(id, actor)
  if (!TABLE_STATUSES.includes(status as TableStatus)) {
    throw new ApiError(400, 'Invalid table status.')
  }
  const { data: updated, error } = await getDb()
    .from(diningTablesTable)
    .update({ status })
    .eq('id', id)
    .select('*')
    .single()
  if (error || !updated) {
    throw new ApiError(404, 'Table not found')
  }
  void recordActivity({
    actorId: actor.id,
    branchId,
    action: 'table.status_changed',
    summary: `Table ${updated.table_number} is now ${status}`,
    entity: 'table',
    entityId: id,
  })
  return toDiningTable(updated as DiningTableRow)
}

export async function deleteTable(id: string, actor: AuthUser): Promise<void> {
  assertUuid(id, 'table')
  const branchId = await assertTableBranchAccess(id, actor)
  const { data: existing } = await getDb()
    .from(diningTablesTable)
    .select('table_number')
    .eq('id', id)
    .maybeSingle()
  // Deactivating instead of deleting keeps historical reservations intact.
  const { error } = await getDb().from(diningTablesTable).update({ is_active: false }).eq('id', id)
  if (error) {
    throw new ApiError(404, 'Table not found')
  }
  void recordActivity({
    actorId: actor.id,
    branchId,
    action: 'table.updated',
    summary: `Table ${existing?.table_number ?? id} was deactivated`,
    entity: 'table',
    entityId: id,
  })
}