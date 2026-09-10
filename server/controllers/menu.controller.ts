import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  createMenuItem,
  deleteMenuItem,
  getMenuItem,
  listMenuItems,
  updateMenuItem,
} from '../services/menu.service'
import { type AuthedRequest } from '../middleware/auth'

export const listMenuItemsController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const options = {
    branch: req.query.branch ? String(req.query.branch) : undefined,
    category: req.query.category ? String(req.query.category) : undefined,
    includeUnavailable: String(req.query.includeUnavailable ?? '').toLowerCase() === 'true',
    featuredOnly: String(req.query.featured ?? '').toLowerCase() === 'true',
  }
  const items = await listMenuItems(options)
  res.json({ items })
})

export const getMenuItemController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const item = await getMenuItem(String(req.params.id))
  res.json({ item })
})

export const createMenuItemController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const item = await createMenuItem(req.body as Record<string, unknown>, req.user)
  res.status(201).json({ item })
})

export const updateMenuItemController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const item = await updateMenuItem(String(req.params.id), req.body as Record<string, unknown>, req.user)
  res.json({ item })
})

export const deleteMenuItemController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await deleteMenuItem(String(req.params.id), req.user)
  res.json({ message: 'Menu item deleted' })
})