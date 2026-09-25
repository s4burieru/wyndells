import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  createBranch,
  deleteBranch,
  getBranch,
  listBranches,
  setBranchActive,
  updateBranch,
} from '../services/branch.service'
import type { AuthedRequest } from '../middleware/auth'

export const listBranchesController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const includeInactive = String(req.query.includeInactive ?? '').toLowerCase() === 'true'
  const branches = await listBranches(includeInactive)
  res.json({ branches })
})

export const getBranchController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const branch = await getBranch(String(req.params.id))
  res.json({ branch })
})

export const createBranchController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const branch = await createBranch(req.body as Record<string, unknown>, req.user)
  res.status(201).json({ branch })
})

export const updateBranchController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const branch = await updateBranch(
    String(req.params.id),
    req.body as Record<string, unknown>,
    req.user,
  )
  res.json({ branch })
})

export const setBranchActiveController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const isActive = String(req.body?.isActive ?? '').toLowerCase() === 'true'
  const branch = await setBranchActive(String(req.params.id), isActive, req.user)
  res.json({ branch })
})

export const deleteBranchController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await deleteBranch(String(req.params.id), req.user)
  res.json({ message: 'Branch deleted' })
})