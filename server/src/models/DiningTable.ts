import type { TableStatus } from '../constants'
import { toBranchRef, type BranchRef, type BranchRefRow } from './Branch'

export const diningTablesTable = 'dining_tables'

/** Row shape as stored in the Supabase `dining_tables` table. */
export type DiningTableRow = {
  id: string
  branch_id: string
  table_number: string
  capacity: number
  location: string
  status: TableStatus
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Column subset used when a table is embedded inside a reservation. */
export type TableRefRow = Pick<DiningTableRow, 'id' | 'table_number' | 'capacity' | 'location' | 'status'>

export type DiningTableWithBranchRow = DiningTableRow & { branch: BranchRefRow }

/** Table reference object embedded in other resources (mirrors the old populate). */
export type TableRef = {
  _id: string
  tableNumber: string
  capacity: number
  location: string
  status: TableStatus
}

/** Public JSON shape returned to the client (mirrors the previous Mongoose document). */
export type DiningTable = {
  _id: string
  branch: BranchRef | string
  tableNumber: string
  capacity: number
  location: string
  status: TableStatus
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function toTableRef(row: TableRefRow): TableRef {
  return {
    _id: row.id,
    tableNumber: row.table_number,
    capacity: row.capacity,
    location: row.location,
    status: row.status,
  }
}

/** Serializes a raw table row with `branch` as the plain branch id (no populate). */
export function toDiningTable(row: DiningTableRow): Omit<DiningTable, 'branch'> & { branch: string } {
  return {
    _id: row.id,
    branch: row.branch_id,
    tableNumber: row.table_number,
    capacity: row.capacity,
    location: row.location,
    status: row.status,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Serializes a table row that came with the embedded `branch` reference. */
export function toDiningTableWithBranch(row: DiningTableWithBranchRow): DiningTable {
  return { ...toDiningTable(row), branch: toBranchRef(row.branch) }
}