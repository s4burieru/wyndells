import mongoose from 'mongoose'
import { DiningTableModel } from '../models/DiningTable'
import { BranchModel } from '../models/Branch'
import { ReservationModel } from '../models/Reservation'
import { ApiError } from '../utils/ApiError'
import { generateReference } from '../utils/reference'
import {
  assertDateString,
  assertEmail,
  assertObjectId,
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

const ObjectId = mongoose.Types.ObjectId

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

function activeReservationFilter(
  branchId: string,
  date: string,
  excludeReservationId?: string,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    branch: branchId,
    date,
    status: { $in: [...ACTIVE_RESERVATION_STATUSES] },
    table: { $ne: null },
  }
  if (excludeReservationId) {
    filter._id = { $ne: excludeReservationId }
  }
  return filter
}

/** Table ids already held by active reservations overlapping the requested time. */
async function occupiedTableIds(
  branchId: string,
  date: string,
  time: string,
  excludeReservationId?: string,
): Promise<string[]> {
  const reservations = await ReservationModel.find(activeReservationFilter(branchId, date, excludeReservationId))
    .select('table time')
    .lean()

  const occupied = new Set<string>()
  for (const reservation of reservations) {
    if (reservation.table && timesOverlap(String(reservation.time), time)) {
      occupied.add(String(reservation.table))
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
  const filter: Record<string, unknown> = {
    branch: branchId,
    date,
    status: { $in: [...ACTIVE_RESERVATION_STATUSES] },
  }
  if (excludeReservationId) {
    filter._id = { $ne: excludeReservationId }
  }
  const reservations = await ReservationModel.find(filter).select('time').lean()
  return reservations.filter((reservation) => timesOverlap(String(reservation.time), time)).length
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
  const query: Record<string, unknown> = {
    branch: branchId,
    isActive: true,
    capacity: { $gte: guests },
    status: { $nin: [...UNBOOKABLE_TABLE_STATUSES] },
  }
  if (occupied.length > 0) {
    query._id = { $nin: occupied }
  }
  return DiningTableModel.find(query).sort({ capacity: 1, tableNumber: 1 }).lean()
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
  const table = await DiningTableModel.findOne({
    _id: tableId,
    branch: branchId,
    isActive: true,
    capacity: { $gte: guests },
    status: { $nin: [...UNBOOKABLE_TABLE_STATUSES] },
  }).lean()
  if (!table) {
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
    const exists = await ReservationModel.exists({ reference })
    if (!exists) {
      return reference
    }
  }
  throw new ApiError(500, 'Could not generate a unique reservation reference. Please try again.')
}

// ---------------------------------------------------------------------------
// Table status bookkeeping
// ---------------------------------------------------------------------------

async function markTableReserved(tableId: string): Promise<void> {
  await DiningTableModel.updateOne(
    { _id: tableId, status: { $in: ['available'] } },
    { $set: { status: 'reserved' } },
  )
}

async function releaseTableIfHeld(tableId: string): Promise<void> {
  // Only auto-release statuses that this workflow set; never clobber manual
  // statuses like "cleaning" or "unavailable".
  await DiningTableModel.updateOne(
    { _id: tableId, status: { $in: ['reserved', 'occupied'] } },
    { $set: { status: 'available' } },
  )
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const RESERVATION_POPULATE = [
  { path: 'branch', select: 'name code address' },
  { path: 'table', select: 'tableNumber capacity location status' },
]

export async function getReservation(id: string) {
  assertObjectId(id, 'reservation')
  const reservation = await ReservationModel.findById(id).populate(RESERVATION_POPULATE).lean()
  if (!reservation) {
    throw new ApiError(404, 'Reservation not found')
  }
  return reservation
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
  const query: Record<string, unknown> = {}
  if (options.branch) {
    query.branch = assertObjectId(options.branch, 'branch')
  }
  if (options.status) {
    query.status = options.status
  }
  if (options.date) {
    query.date = options.date
  }
  const dateRange: Record<string, string> = {}
  if (options.dateFrom) {
    dateRange.$gte = options.dateFrom
  }
  if (options.dateTo) {
    dateRange.$lte = options.dateTo
  }
  if (Object.keys(dateRange).length > 0) {
    query.date = dateRange
  }

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)
  const skip = Math.max(options.skip ?? 0, 0)

  const total = await ReservationModel.countDocuments(query)
  const items = await ReservationModel.find(query)
    .populate(RESERVATION_POPULATE)
    .sort({ date: -1, time: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  return { items, total }
}

// ---------------------------------------------------------------------------
// Public booking flow
// ---------------------------------------------------------------------------

export async function getAvailableTimeSlots(options: { branch: string; date: string; guests: number }) {
  const branchId = assertObjectId(options.branch, 'branch')
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

  const branch = await BranchModel.findOne({ _id: branchId, isActive: true }).lean()
  if (!branch) {
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

  const branchId = assertObjectId(String(payload.branch), 'branch')
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

  const branch = await BranchModel.findOne({ _id: branchId, isActive: true }).lean()
  if (!branch) {
    throw new ApiError(404, 'The selected branch is not available right now.')
  }

  // Light anti-abuse guard: limit same contact/day.
  const bookingsToday = await ReservationModel.countDocuments({
    branch: branchId,
    date,
    contactNumber,
  })
  if (bookingsToday >= MAX_RESERVATIONS_PER_CONTACT_PER_DAY) {
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
  const totalBookableTables = await DiningTableModel.countDocuments({
    branch: branchId,
    isActive: true,
    status: { $nin: [...UNBOOKABLE_TABLE_STATUSES] },
  })
  const activeBookings = await activeBookingsAtTime(branchId, date, time)
  if (activeBookings >= totalBookableTables) {
    throw new ApiError(409, 'That time slot is fully booked. Please try another time or date.')
  }

  const reference = await generateUniqueReference()

  const reservation = await ReservationModel.create({
    reference,
    branch: branchId,
    customerName,
    email,
    contactNumber,
    date,
    time,
    guests,
    specialRequests,
    status: 'pending',
    statusHistory: [{ status: 'pending', note: 'Reservation submitted' }],
  })

  return getReservation(String(reservation._id))
}

export async function verifyReservation(reference: string, contactNumber: string) {
  const normalized = normalizeReference(reference)
  const digits = normalizePhone(contactNumber)
  if (!normalized || !digits) {
    throw new ApiError(400, 'Please provide both your reservation reference and contact number.')
  }
  const reservation = await ReservationModel.findOne({ reference: normalized })
    .populate(RESERVATION_POPULATE)
    .lean()
  if (!reservation || normalizePhone(reservation.contactNumber) !== digits) {
    throw new ApiError(404, 'No reservation matches that reference and contact number.')
  }
  return reservation
}

export async function cancelGuestReservation(reference: string, contactNumber: string) {
  const normalized = normalizeReference(reference)
  const digits = normalizePhone(contactNumber)
  if (!normalized || !digits) {
    throw new ApiError(400, 'Please provide both your reservation reference and contact number.')
  }
  const reservation = await ReservationModel.findOne({ reference: normalized })
  if (!reservation || normalizePhone(reservation.contactNumber) !== digits) {
    throw new ApiError(404, 'No reservation matches that reference and contact number.')
  }
  if (reservation.status === 'cancelled') {
    return getReservation(String(reservation._id))
  }
  if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
    throw new ApiError(400, 'This reservation can no longer be cancelled.')
  }
  if (reservation.table) {
    await releaseTableIfHeld(String(reservation.table))
  }
  reservation.status = 'cancelled'
  reservation.statusHistory.push({
    status: 'cancelled',
    changedAt: new Date(),
    note: 'Cancelled by the customer',
  } as object)
  await reservation.save()
  return getReservation(String(reservation._id))
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
  assertObjectId(id, 'reservation')
  if (!RESERVATION_STATUSES.includes(nextStatus as ReservationStatus)) {
    throw new ApiError(400, 'Invalid reservation status.')
  }
  const reservation = await ReservationModel.findById(id)
  if (!reservation) {
    throw new ApiError(404, 'Reservation not found')
  }
  assertBranchAccess(actor, String(reservation.branch))

  const current = reservation.status
  assertTransition(current, nextStatus)
  if (current === nextStatus) {
    return getReservation(id)
  }

  if (nextStatus === 'confirmed') {
    // A confirmation must hold a table for the slot.
    if (!reservation.table) {
      const available = await findAvailableTables(
        String(reservation.branch),
        reservation.date,
        String(reservation.time),
        reservation.guests,
        id,
      )
      if (available.length === 0) {
        throw new ApiError(
          409,
          'No free table fits this reservation right now. Choose a table manually or reject the reservation.',
        )
      }
      reservation.table = available[0]._id
    } else {
      const free = await canUseTable(
        String(reservation.table),
        String(reservation.branch),
        reservation.date,
        String(reservation.time),
        reservation.guests,
        id,
      )
      if (!free) {
        throw new ApiError(
          409,
          'The assigned table is no longer available for this time slot. Please choose another table first.',
        )
      }
    }
    await markTableReserved(String(reservation.table))
  } else if (reservation.table && ['completed', 'cancelled', 'rejected', 'no-show'].includes(nextStatus)) {
    await releaseTableIfHeld(String(reservation.table))
  }

  reservation.status = nextStatus as ReservationStatus
  reservation.statusHistory.push({
    status: nextStatus,
    changedBy: reservedIfDefined(actor.id),
    changedAt: new Date(),
    note: note.trim().slice(0, 300),
  } as object)
  await reservation.save()

  return getReservation(id)
}

export async function assignTable(id: string, tableId: string, actor: AuthUser) {
  assertObjectId(id, 'reservation')
  const tableIdValue = assertObjectId(tableId, 'table')

  const reservation = await ReservationModel.findById(id)
  if (!reservation) {
    throw new ApiError(404, 'Reservation not found')
  }
  assertBranchAccess(actor, String(reservation.branch))
  if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
    throw new ApiError(400, 'Only pending or confirmed reservations can be assigned a table.')
  }

  const free = await canUseTable(
    tableIdValue,
    String(reservation.branch),
    reservation.date,
    String(reservation.time),
    reservation.guests,
    id,
  )
  if (!free) {
    throw new ApiError(409, 'The selected table is not available for this time slot.')
  }

  const previousTable = reservation.table
  reservation.table = new ObjectId(tableIdValue)
  await reservation.save()

  if (previousTable && String(previousTable) !== tableIdValue) {
    await releaseTableIfHeld(String(previousTable))
  }
  await markTableReserved(tableIdValue)

  return getReservation(id)
}

/** Returns the id as-is, or null when undefined (no user attribution). */
function reservedIfDefined(value: string | undefined): string | null {
  return value === undefined ? null : value
}