import { MenuItemModel } from '../models/MenuItem'
import { BranchModel } from '../models/Branch'
import { ApiError } from '../utils/ApiError'
import { pickFields } from '../utils/pick'
import { assertObjectId, requireFields } from '../utils/validate'
import { MENU_CATEGORIES, type MenuCategory } from '../constants'
import { assertBranchAccess, type AuthUser } from '../middleware/auth'

const MENU_EDITABLE_FIELDS = ['name', 'description', 'price', 'category', 'image', 'status', 'isFeatured']

async function assertMenuItemBranchAccess(id: string, actor: AuthUser): Promise<void> {
  const match = await MenuItemModel.findById(id).select('branch').lean()
  if (!match) {
    throw new ApiError(404, 'Menu item not found')
  }
  assertBranchAccess(actor, String(match.branch))
}

export async function listMenuItems(options: {
  branch?: string
  category?: string
  includeUnavailable?: boolean
  featuredOnly?: boolean
  limit?: number
}) {
  const query: Record<string, unknown> = {}
  if (options.branch) {
    query.branch = assertObjectId(options.branch, 'branch')
  }
  if (options.category) {
    query.category = options.category
  }
  if (!options.includeUnavailable) {
    query.status = 'available'
  }
  if (options.featuredOnly) {
    query.isFeatured = true
  }

  let cursor = MenuItemModel.find(query).populate('branch', 'name code').sort({ category: 1, name: 1 })
  if (options.limit && options.limit > 0) {
    cursor = cursor.limit(options.limit)
  }
  return cursor.lean()
}

export async function getMenuItem(id: string) {
  assertObjectId(id, 'menu item')
  const item = await MenuItemModel.findById(id).populate('branch', 'name code').lean()
  if (!item) {
    throw new ApiError(404, 'Menu item not found')
  }
  return item
}

export async function createMenuItem(payload: Record<string, unknown>, actor: AuthUser) {
  requireFields(payload, ['branch', 'name', 'price', 'category'])
  const branchId = assertObjectId(String(payload.branch), 'branch')
  assertBranchAccess(actor, branchId)
  const category = String(payload.category)
  if (!MENU_CATEGORIES.includes(category as MenuCategory)) {
    throw new ApiError(400, 'Invalid menu category.')
  }
  const price = Number(payload.price)
  if (!Number.isFinite(price) || price < 0) {
    throw new ApiError(400, 'Price must be a non-negative number.')
  }
  const branch = await BranchModel.exists({ _id: branchId })
  if (!branch) {
    throw new ApiError(400, 'The selected branch does not exist.')
  }
  const updates = pickFields(payload, ['name', 'description', 'price', 'category', 'image', 'status', 'isFeatured'])
  updates.branch = branchId
  updates.price = price
  updates.category = category
  return MenuItemModel.create(updates)
}

export async function updateMenuItem(id: string, payload: Record<string, unknown>, actor: AuthUser) {
  assertObjectId(id, 'menu item')
  await assertMenuItemBranchAccess(id, actor)
  const updates = pickFields(payload, MENU_EDITABLE_FIELDS)
  if (updates.price !== undefined) {
    const price = Number(updates.price)
    if (!Number.isFinite(price) || price < 0) {
      throw new ApiError(400, 'Price must be a non-negative number.')
    }
    updates.price = price
  }
  const item = await MenuItemModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
  if (!item) {
    throw new ApiError(404, 'Menu item not found')
  }
  return item
}

export async function deleteMenuItem(id: string, actor: AuthUser): Promise<void> {
  assertObjectId(id, 'menu item')
  await assertMenuItemBranchAccess(id, actor)
  const item = await MenuItemModel.findByIdAndDelete(id)
  if (!item) {
    throw new ApiError(404, 'Menu item not found')
  }
}