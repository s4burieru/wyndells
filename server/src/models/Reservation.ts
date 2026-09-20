import type { ReservationStatus } from '../constants'
import type { BranchRef, BranchRefRowWithAddress } from './Branch'
import { toTableRef, type TableRef, type TableRefRow } from './DiningTable'

export const reservationsTable = 'reservations'

/** One entry of the jsonb `status_history` array (mirrors the previous subdocument schema). */
export type ReservationStatusHistoryEntry = {
  status: ReservationStatus
  changedBy: string | null
  changedAt: string
  note: string
}

/** Row shape as stored in the Supabase `reservations` table. */
export type ReservationRow = {
  id: string
  reference: string
  branch_id: string
  table_id: string | null
  customer_name: string
  email: string
  contact_number: string
  /** Stored as YYYY-MM-DD so all availability logic is timezone-safe and string-comparable. */
  date: string
  /** 24-hour time, e.g. "18:30". */
  time: string
  guests: number
  special_requests: string
  status: ReservationStatus
  status_history: ReservationStatusHistoryEntry[]
  created_at: string
  updated_at: string
}

export type ReservationWithBranchRow = ReservationRow & {
  branch: BranchRefRowWithAddress
  table: TableRefRow | null
}

/** Public JSON shape returned to the client (mirrors the previous Mongoose document). */
export type Reservation = {
  _id: string
  reference: string
  branch: BranchRef & { address?: string }
  table: TableRef | null
  customerName: string
  email: string
  contactNumber: string
  date: string
  time: string
  guests: number
  specialRequests: string
  status: ReservationStatus
  statusHistory: ReservationStatusHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export function toReservation(row: ReservationWithBranchRow): Reservation {
  return {
    _id: row.id,
    reference: row.reference,
    branch: {
      _id: row.branch.id,
      name: row.branch.name,
      code: row.branch.code,
      ...(row.branch.address !== undefined ? { address: row.branch.address } : {}),
    },
    table: row.table ? toTableRef(row.table) : null,
    customerName: row.customer_name,
    email: row.email,
    contactNumber: row.contact_number,
    date: row.date,
    time: row.time,
    guests: row.guests,
    specialRequests: row.special_requests,
    status: row.status,
    statusHistory: row.status_history,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}