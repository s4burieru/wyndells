import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { getOverview } from '../services/report.service'
import type { AuthedRequest } from '../middleware/auth'

export const overviewController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const overview = await getOverview(req.user)
  res.json({ overview })
})