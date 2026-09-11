import { getDb } from '../config/db'
import { diningTablesTable, toDiningTable, type DiningTableRow } from '../models/DiningTable'
import { branchesTable } from '../models/Branch'
import { reservationsTable, toReservation, type ReservationRow, type ReservationWithBranchRow } from '../models/Reservation'
import { ApiError, isDuplicateKeyError } from '../utils/ApiError'
import { generateReference } from '../utils/reference'
import {
  assertDateString,
  assertEmail,
  assertUuid,
  assertPhone,
  assertTimeString,
  isRealDate,
  normalizePhone,
  normalizeReference,
  requireFields,
  todayString,
} from '../utils/validate'
import {
  ACTIVE_RESERVATION_STATUSES,
  MAX_GUESTS_PER_RESERVATION,
  MAX_RESERVATIONS_PER_CONTACT_PER_DAY,
  RESERVATION_STATUSES,
  RESERVATION_TRANSITIONS,
  UNBOOKABLE_TABLE_STATUSES,
  type ReservationStatus,
} from '../constants'
import { assertBranchAccess, type AuthUser } from '../middleware/auth'

/** Reservations are treated as occupying a table for 90 minutes. */
const BOOKING_WINDOW_MINUTES = 90
const SLOT_START_MINUTES = 10 * 60 // 10:00
const SLOT_END_MINUTES = 21 * 60 // 21:00
const SLOT_STEP_MINUTES = 30

/** Select that embeds the branch and table references (mirrors mongoose `.populate`). */
const RESERVATION_SELECT = '*, branch:branch_id(id, name, code, address), table:table_id(id, table_number, capacity, location, status)'

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function timesOverlap(timeA: string, timeB: string): boolean {
  return Math.abs(timeToMinutes(timeA) - timeToMinutes(timeB)) < BOOKING_WINDOW_MINUTES
}

/** Business slots from 10:00 to 21:00 in 30-minute steps. */
export function businessTimeSlots(): string[] {
  const slots: string[] = []
  for (let minutes = SLOT_START_MINUTES; minutes <= SLOT_END_MINUTES; minutes += SLOT_STEP_MINUTES) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    slots.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`)
  }
  return slots
}

// ---------------------------------------------------------------------------
// Availability logic
// ---------------------------------------------------------------------------

/** Table ids already held by active reservations overlapping the requested time. */
async function occupiedTableIds(
  branchId: string,
  date: string,
  time: string,
  excludeReservationId?: string,
): Promise<string[]> {
  let query = getDb()
    .from(reservationsTable)
    .select('table_id, time')
    .eq('branch_id', branchId)
    .eq('date', date)
    .in('status', [...ACTIVE_RESERVATION_STATUSES])
    .not('table_id', 'is', 'null')
  if (excludeReservationId) {
    query = query.neq('id', excludeReservationId)
  }
  const { data, error } = await query
  if (error) {
    throw new ApiError(500, 'Could not check reservation availability.')
  }

  const occupied = new Set<string>()
  for (const reservation of data ?? []) {
    if (timesOverlap(String(reservation.time), time)) {
      occupied.add(String(reservation.table_id))
    }
  }
  return [...occupied]
}

/** Number of active reservations (with or without a table) overlapping the requested time. */
async function activeBookingsAtTime(
  branchId: string,
  date: string,
  time: string,
  excludeReservationId?: string,
): Promise<number> {
  let query = getDb()
    .from(reservationsTable)
    .select('time')
    .eq('branch_id', branchId)
    .eq('date', date)
    .in('status', [...ACTIVE_RESERVATION_STATUSES])
  if (excludeReservationId) {
    query = query.neq('id', excludeReservationId)
  }
  const { data, error } = await query
  if (error) {
    throw new ApiError(500, 'Could not check reservation availability.')
  }
  return (data ?? []).filter((reservation) => timesOverlap(String(reservation.time), time)).length
}

/**
 * Tables that could seat `guests` at the given branch/slot and are not already
 * held by another active reservation.
 */
export async function findAvailableTables(
  branchId: string,
  date: string,
  time: string,
  guests: number,
  excludeReservationId?: string,
) {
  const occupied = await occupiedTableIds(branchId, date, time, excludeReservationId)
  let query = getDb()
    .from(diningTablesTable)
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .gte('capacity', guests)
    .not('status', 'in', [...UNBOOKABLE_TABLE_STATUSES])
  if (occupied.length > 0) {
    query = query.not('id', 'in', occupied)
  }
  const { data, error } = await query.order('capacity').order('table_number')
  if (error) {
    throw new ApiError(500, 'Could not check table availability.')
  }
  return (data ?? []).map((row) => toDiningTable(row as DiningTableRow))
}

/** Whether a specific table can take a booking at the given slot. */
export async function canUseTable(
  tableId: string,
  branchId: string,
  date: string,
  time: string,
  guests: number,
  excludeReservationId?: string,
): Promise<boolean> {
  const { data: table, error } = await getDb()
    .from(diningTablesTable)
    .select('id')
    .eq('id', tableId)
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .gte('capacity', guests)
    .not('status', 'in', [...UNBOOKABLE_TABLE_STATUSES])
    .maybeSingle()
  if (error || !table) {
    return false
  }
  const occupied = await occupiedTableIds(branchId, date, time, excludeReservationId)
  return !occupied.includes(tableId)
}

// ---------------------------------------------------------------------------
// Reference generation
// ---------------------------------------------------------------------------

async function generateUniqueReference(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const reference = generateReference()
    const { data: existing, error } = await getDb()
      .from(reservationsTable)
      .select('id')
      .eq('reference', reference)
      .maybeSingle()
    if (!error && !existing) {
      return reference
    }
  }
  throw new ApiError(500, 'Could not generate a unique reservation reference. Please try again.')
}

// ---------------------------------------------------------------------------
// Table status bookkeeping
// ---------------------------------------------------------------------------

async function markTableReserved(tableId: string): Promise<void> {
  const { error } = await getDb()
    .from(diningTablesTable)
    .update({ status: 'reserved' })
    .eq('id', tableId)
    .in('status', ['available'])
  if (error) {
    throw new ApiError(500, 'Could not update the table.')
  }
}

async function releaseTableIfHeld(tableId: string): Promise<void> {
  // Only auto-release statuses that this workflow set; never clobber manual
  // statuses like "cleaning" or "unavailable".
  const { error } = await getDb()
    .from(diningTablesTable)
    .update({ status: 'available' })
    .eq('id', tableId)
    .in('status', ['reserved', 'occupied'])
  if (error) {
    throw new ApiError(500, 'Could not update the table.')
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getReservation(id: string) {
  assertUuid(id, 'reservation')
  const { data: reservation, error } = await getDb()
    .from(reservationsTable)
    .select(RESERVATION_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error || !reservation) {
    throw new ApiError(404, 'Reservation not found')
  }
  return toReservation(reservation as ReservationWithBranchRow)
}

export async function listReservations(options: {
  branch?: string
  status?: string
  date?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  skip?: number
}) {
  let query = getDb().from(reservationsTable).select(RESERVATION_SELECT, { count: 'exact' })
  if (options.branch) {
    query = query.eq('branch_id', assertUuid(options.branch, 'branch'))
  }
  if (options.status) {
    query = query.eq('status', options.status)
  }
  if (options.date) {
    query = query.eq('date', options.date)
  }
  if (options.dateFrom) {
    query = query.gte('date', options.dateFrom)
  }
  if (options.dateTo) {
    query = query.lte('date', options.dateTo)
  }

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)
  const skip = Math.max(options.skip ?? 0, 0)

  const { data, count, error } = await query
    .order('date', { ascending: false })
    .order('time', { ascending: false })
    .order('created_at', { ascending: false })
    .range(skip, skip + limit - 1)
  if (error) {
    throw new ApiError(500, 'Could not load reservations.')
  }

  const items = (data ?? []).map((row) => toReservation(row as ReservationWithBranchRow))
  return { items, total: count ?? items.length }
}

// ---------------------------------------------------------------------------
// Public booking flow
// ---------------------------------------------------------------------------

export async function getAvailableTimeSlots(options: { branch: string; date: string; guests: number }) {
  const branchId = assertUuid(options.branch, 'branch')
  assertDateString(options.date)
  if (!isRealDate(options.date)) {
    throw new ApiError(400, 'Please provide a valid date.')
  }
  if (options.date < todayString()) {
    throw new ApiError(400, 'Please choose a date in the future.')
  }
  const guests = Number(options.guests)
  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS_PER_RESERVATION) {
    throw new ApiError(400, `Number of guests must be between 1 and ${MAX_GUESTS_PER_RESERVATION}.`)
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

  const nowMinutesToday = timeToMinutesToday()
  const slots: { time: string; availableSpots: number }[] = []
  for (const time of businessTimeSlots()) {
    if (options.date === todayString() && timeToMinutes(time) <= nowMinutesToday) {
      continue
    }
    const tables = await findAvailableTables(branchId, options.date, time, guests)
    if (tables.length > 0) {
      slots.push({ time, availableSpots: tables.length })
    }
  }
  return slots
}

function timeToMinutesToday(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export async function createReservation(payload: Record<string, unknown>) {
  requireFields(payload, ['branch', 'customerName', 'email', 'contactNumber', 'date', 'time', 'guests'])

  const branchId = assertUuid(String(payload.branch), 'branch')
  const customerName = String(payload.customerName).trim()
  const email = String(payload.email).trim().toLowerCase()
  const contactNumber = String(payload.contactNumber).trim()
  const date = String(payload.date).trim()
  const time = String(payload.time).trim()
  const guests = Number(payload.guests)
  const specialRequests = String(payload.specialRequests ?? '').trim().slice(0, 500)

  assertEmail(email)
  assertPhone(contactNumber)
  assertDateString(date)
  if (!isRealDate(date)) {
    throw new ApiError(400, 'Please provide a valid date.')
  }
  if (date < todayString()) {
    throw new ApiError(400, 'Reservations cannot be made for a past date.')
  }
  assertTimeString(time)
  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS_PER_RESERVATION) {
    throw new ApiError(400, `Number of guests must be between 1 and ${MAX_GUESTS_PER_RESERVATION}.`)
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

  // Light anti-abuse guard: limit same contact/day.
  const { count: bookingsToday, error: countError } = await getDb()
    .from(reservationsTable)
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .eq('date', date)
    .eq('contact_number', contactNumber)
  if (countError) {
    throw new ApiError(500, 'Could not check your existing reservations.')
  }
  if ((bookingsToday ?? 0) >= MAX_RESERVATIONS_PER_CONTACT_PER_DAY) {
    throw new ApiError(
      409,
      'You already have reservations for this date. Please contact the branch directly if you need more.',
    )
  }

  // Actual table availability.
  const availableTables = await findAvailableTables(branchId, date, time, guests)
  if (availableTables.length === 0) {
    throw new ApiError(
      409,
      'No tables are available for the selected date and time. Please choose a different time, date, or branch.',
    )
  }

  // Capacity backstop so unlimited pending requests cannot flood a slot.
  const { count: totalBookableTables, error: tableCountError } = await getDb()
    .from(diningTablesTable)
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .not('status', 'in', [...UNBOOKABLE_TABLE_STATUSES])
  if (tableCountError) {
    throw new ApiError(500, 'Could not check table availability.')
  }
  const activeBookings = await activeBookingsAtTime(branchId, date, time)
  if (activeBookings >= (totalBookableTables ?? 0)) {
    throw new ApiError(409, 'That time slot is fully booked. Please try another time or date.')
  }

  const reference = await generateUniqueReference()

  const { data: created, error } = await getDb()
    .from(reservationsTable)
    .insert({
      reference,
      branch_id: branchId,
      customer_name: customerName,
      email,
      contact_number: contactNumber,
      date,
      time,
      guests,
      special_requests: specialRequests,
      status: 'pending',
      status_history: [{ status: 'pending', note: 'Reservation submitted' }],
    })
    .select('id')
    .single()
  if (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, 'Could not save the reservation. Please try again.')
    }
    throw new ApiError(500, 'Could not save the reservation.')
  }

  return getReservation(created.id)
}

export async function verifyReservation(reference: string, contactNumber: string) {
  const normalized = normalizeReference(reference)
  const digits = normalizePhone(contactNumber)
  if (!normalized || !digits) {
    throw new ApiError(400, 'Please provide both your reservation reference and contact number.')
  }
  const { data: reservation, error } = await getDb()
    .from(reservationsTable)
    .select(RESERVATION_SELECT)
    .eq('reference', normalized)
    .maybeSingle()
  const row = error ? null : (reservation as ReservationWithBranchRow | null)
  if (!row || normalizePhone(row.contact_number) !== digits) {
    throw new ApiError(404, 'No reservation matches that reference and contact number.')
  }
  return toReservation(row)
}

export async function cancelGuestReservation(reference: string, contactNumber: string) {
  const normalized = normalizeReference(reference)
  const digits = normalizePhone(contactNumber)
  if (!normalized || !digits) {
    throw new ApiError(400, 'Please provide both your reservation reference and contact number.')
  }
  const { data: reservation, error } = await getDb()
    .from(reservationsTable)
    .select(RESERVATION_SELECT)
    .eq('reference', normalized)
    .maybeSingle()
  const row = error ? null : (reservation as ReservationWithBranchRow | null)
  if (!row || normalizePhone(row.contact_number) !== digits) {
    throw new ApiError(404, 'No reservation matches that reference and contact number.')
  }
  if (row.status === 'cancelled') {
    return toReservation(row)
  }
  if (!ACTIVE_RESERVATION_STATUSES.includes(row.status)) {
    throw new ApiError(400, 'This reservation can no longer be cancelled.')
  }
  if (row.table_id) {
    await releaseTableIfHeld(String(row.table_id))
  }
  const history = [
    ...row.status_history,
    { status: 'cancelled', changedAt: new Date().toISOString(), note: 'Cancelled by the customer' },
  ]
  const { error: updateError } = await getDb()
    .from(reservationsTable)
    .update({ status: 'cancelled', status_history: history })
    .eq('id', row.id)
  if (updateError) {
    throw new ApiError(500, 'Could not cancel the reservation.')
  }
  return getReservation(row.id)
}

// ---------------------------------------------------------------------------
// Staff workflows
// ---------------------------------------------------------------------------

function assertTransition(current: string, next: string): void {
  if (!RESERVATION_STATUSES.includes(current as ReservationStatus)) {
    throw new ApiError(400, 'The reservation is in an unknown state.')
  }
  if (current === next) {
    return
  }
  const allowed = RESERVATION_TRANSITIONS[current as ReservationStatus]
  if (!allowed.includes(next as ReservationStatus)) {
    throw new ApiError(400, `A "${current}" reservation cannot be changed to "${next}".`)
  }
}

export async function updateReservationStatus(
  id: string,
  nextStatus: string,
  note: string,
  actor: AuthUser,
) {
  assertUuid(id, 'reservation')
  if (!RESERVATION_STATUSES.includes(nextStatus as ReservationStatus)) {
    throw new ApiError(400, 'Invalid reservation status.')
  }
  const { data: reservation, error: fetchError } = await getDb()
    .from(reservationsTable)
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (fetchError || !reservation) {
    throw new ApiError(404, 'Reservation not found')
  }
  const row = reservation as ReservationRow
  assertBranchAccess(actor, String(row.branch_id))

  const current = row.status
  assertTransition(current, nextStatus)
  if (current === nextStatus) {
    return getReservation(id)
  }

  let tableId = row.table_id
  if (nextStatus === 'confirmed') {
    // A confirmation must hold a table for the slot.
    if (!row.table_id) {
      const available = await findAvailableTables(
        String(row.branch_id),
        row.date,
        String(row.time),
        row.guests,
        id,
      )
      if (available.length === 0) {
        throw new ApiError(
          409,
          'No free table fits this reservation right now. Choose a table manually or reject the reservation.',
        )
      }
      tableId = available[0]._id
    } else {
      const free = await canUseTable(
        String(row.table_id),
        String(row.branch_id),
        row.date,
        String(row.time),
        row.guests,
        id,
      )
      if (!free) {
        throw new ApiError(
          409,
          'The assigned table is no longer available for this time slot. Please choose another table first.',
        )
      }
    }
    await markTableReserved(String(tableId))
  } else if (row.table_id && ['completed', 'cancelled', 'rejected', 'no-show'].includes(nextStatus)) {
    await releaseTableIfHeld(String(row.table_id))
  }

  const history = [
    ...row.status_history,
    {
      status: nextStatus,
      changedBy: reservedIfDefined(actor.id),
      changedAt: new Date().toISOString(),
      note: note.trim().slice(0, 300),
    },
  ]
  const { error: updateError } = await getDb()
    .from(reservationsTable)
    .update({ status: nextStatus, table_id: tableId, status_history: history })
    .eq('id', id)
  if (updateError) {
    throw new ApiError(500, 'Could not update the reservation.')
  }

  return getReservation(id)
}

export async function assignTable(id: string, tableId: string, actor: AuthUser) {
  assertUuid(id, 'reservation')
  const tableIdValue = assertUuid(tableId, 'table')

  const { data: reservation, error: fetchError } = await getDb()
    .from(reservationsTable)
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (fetchError || !reservation) {
    throw new ApiError(404, 'Reservation not found')
  }
  const row = reservation as ReservationRow
  assertBranchAccess(actor, String(row.branch_id))
  if (!ACTIVE_RESERVATION_STATUSES.includes(row.status)) {
    throw new ApiError(400, 'Only pending or confirmed reservations can be assigned a table.')
  }

  const free = await canUseTable(
    tableIdValue,
    String(row.branch_id),
    row.date,
    String(row.time),
    row.guests,
    id,
  )
  if (!free) {
    throw new ApiError(409, 'The selected table is not available for this time slot.')
  }

  const previousTable = row.table_id
  const { error: updateError } = await getDb()
    .from(reservationsTable)
    .update({ table_id: tableIdValue })
    .eq('id', id)
  if (updateError) {
    throw new ApiError(500, 'Could not assign the table.')
  }

  if (previousTable && previousTable !== tableIdValue) {
    await releaseTableIfHeld(String(previousTable))
  }
  await markTableReserved(tableIdValue)

  return getReservation(id)
}

/** Returns the id as-is, or null when undefined (no user attribution). */
function reservedIfDefined(value: string | undefined): string | null {
  return value === undefined ? null : value
}