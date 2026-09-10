import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  assignTable,
  cancelGuestReservation,
  createReservation,
  getAvailableTimeSlots,
  getReservation,
  listReservations,
  updateReservationStatus,
  verifyReservation,
} from '../services/reservation.service'
import { assertBranchAccess, type AuthedRequest } from '../middleware/auth'

// --- Public (no authentication) -------------------------------------------

export const createReservationController = asyncHandler(async (req, res) => {
  const reservation = await createReservation(req.body as Record<string, unknown>)
  res.status(201).json({ reservation })
})

export const getSlotsController = asyncHandler(async (req, res) => {
  const slots = await getAvailableTimeSlots({
    branch: String(req.query.branch ?? ''),
    date: String(req.query.date ?? ''),
    guests: Number(req.query.guests ?? 0),
  })
  res.json({ slots })
})

export const verifyReservationController = asyncHandler(async (req, res) => {
  const body = req.body as { reference?: unknown; contactNumber?: unknown }
  const reservation = await verifyReservation(
    body.reference ? String(body.reference) : '',
    body.contactNumber ? String(body.contactNumber) : '',
  )
  res.json({ reservation })
})

export const cancelReservationController = asyncHandler(async (req, res) => {
  const body = req.body as { contactNumber?: unknown }
  const reservation = await cancelGuestReservation(
    String(req.params.reference),
    body.contactNumber ? String(body.contactNumber) : '',
  )
  res.json({ reservation })
})

// --- Protected (admin | manager) -------------------------------------------

function scopedListBranch(user: AuthedRequest['user'], requested: string | undefined): string | undefined {
  if (user.role === 'manager') {
    return user.branch ?? undefined
  }
  return requested ? String(requested) : undefined
}

export const listReservationsController = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    const requested = req.query.branch ? String(req.query.branch) : undefined
    const { items, total } = await listReservations({
      branch: scopedListBranch(req.user, requested),
      status: req.query.status ? String(req.query.status) : undefined,
      date: req.query.date ? String(req.query.date) : undefined,
      dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
      dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      skip: req.query.skip ? Number(req.query.skip) : undefined,
    })
    res.json({ reservations: items, total })
  },
)

export const getReservationController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id)
  // Branch-level access is checked inside the status/table handlers; for reads
  // the reservation is loaded to verify the actor may view it.
  const reservation = await getReservation(id)
  assertBranchAccess(req.user, reservation.branch ? String(reservation.branch) : undefined)
  res.json({ reservation })
})

export const updateReservationStatusController = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    const nextStatus = String(req.body?.status ?? '')
    const note = String(req.body?.note ?? '')
    const reservation = await updateReservationStatus(String(req.params.id), nextStatus, note, req.user)
    res.json({ reservation })
  },
)

export const assignTableController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const tableId = String(req.body?.tableId ?? '')
  const reservation = await assignTable(String(req.params.id), tableId, req.user)
  res.json({ reservation })
})