import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  createTable,
  deleteTable,
  listTables,
  setTableStatus,
  updateTable,
} from '../services/table.service'
import { findAvailableTables } from '../services/reservation.service'
import { assertBranchAccess, type AuthedRequest } from '../middleware/auth'
import { assertDateString, assertTimeString } from '../utils/validate'

export const listTablesController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = req.user
  const branch = req.query.branch ? String(req.query.branch) : undefined
  const includeInactive = String(req.query.includeInactive ?? '').toLowerCase() === 'true'
  const date = req.query.date ? String(req.query.date) : undefined
  const time = req.query.time ? String(req.query.time) : undefined
  const guests = req.query.guests ? Number(req.query.guests) : undefined

  if (date && time && guests) {
    // Availability listing: only tables free for the requested slot.
    assertDateString(date)
    assertTimeString(time)
    assertBranchAccess(user, branch)
    const tables = await findAvailableTables(
      branch ?? user.branch!,
      date,
      time,
      guests,
    )
    res.json({ tables })
    return
  }

  const tables = await listTables({ branch, includeInactive }, user)
  res.json({ tables })
})

export const createTableController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const table = await createTable(req.body as Record<string, unknown>, req.user)
  res.status(201).json({ table })
})

export const updateTableController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const table = await updateTable(String(req.params.id), req.body as Record<string, unknown>, req.user)
  res.json({ table })
})

export const setTableStatusController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const status = String(req.body?.status ?? '')
  const table = await setTableStatus(String(req.params.id), status, req.user)
  res.json({ table })
})

export const deleteTableController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await deleteTable(String(req.params.id), req.user)
  res.json({ message: 'Table deactivated' })
})