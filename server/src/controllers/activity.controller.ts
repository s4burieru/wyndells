import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { listActivity } from '../services/activity.service'
import type { AuthedRequest } from '../middleware/auth'

/** Admin-only audit trail. Managers have no route to this data. */
export const listActivityController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const group = req.query.group ? String(req.query.group) : undefined
  const actor = req.query.actor ? String(req.query.actor) : undefined
  const branch = req.query.branch ? String(req.query.branch) : undefined
  const page = req.query.page ? Number(req.query.page) : 1

  const result = await listActivity({
    group,
    actorId: actor,
    branch,
    page: Number.isFinite(page) ? page : 1,
  })
  res.json(result)
})
