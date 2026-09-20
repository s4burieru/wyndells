import { getDb } from '../config/database'
import { menuItemsTable, toMenuItem, toMenuItemWithBranch, type MenuItemRow, type MenuItemWithBranchRow } from '../models/MenuItem'
import { branchesTable } from '../models/Branch'
import { ApiError } from '../utils/ApiError'
import { pickFields } from '../utils/pick'
import { assertUuid, requireFields } from '../utils/validate'
import { MENU_CATEGORIES, type MenuCategory } from '../constants'
import { assertBranchAccess, type AuthUser } from '../middleware/auth'

const MENU_EDITABLE_FIELDS = ['name', 'description', 'price', 'category', 'image', 'status', 'isFeatured']

/** Select used for reads that embed the branch reference (mirrors mongoose `.populate`). */
const MENU_SELECT = '*, branch:branch_id(id, name, code)'

/**
 * Select used for public reads. The inner join lets us filter on the branch, so
 * dishes from a deactivated branch stay out of the public menu.
 */
const PUBLIC_MENU_SELECT = '*, branch:branch_id!inner(id, name, code)'

async function assertMenuItemBranchAccess(id: string, actor: AuthUser): Promise<void> {
  const { data: match, error } = await getDb()
    .from(menuItemsTable)
    .select('branch_id')
    .eq('id', id)
    .maybeSingle()
  if (error || !match) {
    throw new ApiError(404, 'Menu item not found')
  }
  assertBranchAccess(actor, String(match.branch_id))
}

export async function listMenuItems(options: {
  branch?: string
  category?: string
  includeUnavailable?: boolean
  featuredOnly?: boolean
  limit?: number
  /** Staff views set this so a deactivated branch's menu stays manageable. */
  includeInactiveBranches?: boolean
}) {
  const publicRead = !options.includeInactiveBranches
  const select: string = publicRead ? PUBLIC_MENU_SELECT : MENU_SELECT
  let query = getDb().from(menuItemsTable).select(select)
  if (publicRead) {
    // Deactivated branches are hidden from the public QR menu (and the home page).
    query = query.eq('branch.is_active', true)
  }
  if (options.branch) {
    query = query.eq('branch_id', assertUuid(options.branch, 'branch'))
  }
  if (options.category) {
    query = query.eq('category', options.category)
  }
  if (!options.includeUnavailable) {
    query = query.eq('status', 'available')
  }
  if (options.featuredOnly) {
    query = query.eq('is_featured', true)
  }
  query = query.order('category').order('name')
  if (options.limit && options.limit > 0) {
    query = query.limit(options.limit)
  }
  const { data, error } = await query
  if (error) {
    throw new ApiError(500, 'Could not load menu items.')
  }
  // `select` is a runtime string (the public/staff selects differ), so the row
  // type is widened by the client — cast as the model row before serializing.
  return (data ?? []).map((row) => toMenuItemWithBranch(row as unknown as MenuItemWithBranchRow))
}

export async function getMenuItem(id: string) {
  assertUuid(id, 'menu item')
  const { data: item, error } = await getDb()
    .from(menuItemsTable)
    .select(MENU_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error || !item) {
    throw new ApiError(404, 'Menu item not found')
  }
  return toMenuItemWithBranch(item as MenuItemWithBranchRow)
}

export async function createMenuItem(payload: Record<string, unknown>, actor: AuthUser) {
  requireFields(payload, ['branch', 'name', 'price', 'category'])
  const branchId = assertUuid(String(payload.branch), 'branch')
  assertBranchAccess(actor, branchId)
  const category = String(payload.category)
  if (!MENU_CATEGORIES.includes(category as MenuCategory)) {
    throw new ApiError(400, 'Invalid menu category.')
  }
  const price = Number(payload.price)
  if (!Number.isFinite(price) || price < 0) {
    throw new ApiError(400, 'Price must be a non-negative number.')
  }
  const { data: branch, error: branchError } = await getDb()
    .from(branchesTable)
    .select('id')
    .eq('id', branchId)
    .maybeSingle()
  if (branchError || !branch) {
    throw new ApiError(400, 'The selected branch does not exist.')
  }

  const updates = pickFields(payload, ['name', 'description', 'price', 'category', 'image', 'status', 'isFeatured'])
  const { data: created, error } = await getDb()
    .from(menuItemsTable)
    .insert({
      branch_id: branchId,
      name: String(updates.name),
      description: updates.description === undefined ? '' : String(updates.description),
      price,
      category,
      image: updates.image === undefined ? '' : String(updates.image),
      status: updates.status === undefined ? 'available' : String(updates.status),
      is_featured: updates.isFeatured === undefined ? false : Boolean(updates.isFeatured),
    })
    .select('*')
    .single()
  if (error) {
    throw new ApiError(500, 'Could not create the menu item.')
  }
  return toMenuItem(created as MenuItemRow)
}

export async function updateMenuItem(id: string, payload: Record<string, unknown>, actor: AuthUser) {
  assertUuid(id, 'menu item')
  await assertMenuItemBranchAccess(id, actor)
  const updates = pickFields(payload, MENU_EDITABLE_FIELDS)

  const row: Record<string, unknown> = {}
  if (updates.name !== undefined) row.name = String(updates.name)
  if (updates.description !== undefined) row.description = String(updates.description)
  if (updates.image !== undefined) row.image = String(updates.image)
  if (updates.status !== undefined) row.status = String(updates.status)
  if (updates.isFeatured !== undefined) row.is_featured = Boolean(updates.isFeatured)
  if (updates.category !== undefined) {
    const category = String(updates.category)
    if (!MENU_CATEGORIES.includes(category as MenuCategory)) {
      throw new ApiError(400, 'Invalid menu category.')
    }
    row.category = category
  }
  if (updates.price !== undefined) {
    const price = Number(updates.price)
    if (!Number.isFinite(price) || price < 0) {
      throw new ApiError(400, 'Price must be a non-negative number.')
    }
    row.price = price
  }

  const { data: updated, error } = await getDb()
    .from(menuItemsTable)
    .update(row)
    .eq('id', id)
    .select('*')
    .single()
  if (error || !updated) {
    throw new ApiError(404, 'Menu item not found')
  }
  return toMenuItem(updated as MenuItemRow)
}

export async function deleteMenuItem(id: string, actor: AuthUser): Promise<void> {
  assertUuid(id, 'menu item')
  await assertMenuItemBranchAccess(id, actor)
  const { data, error } = await getDb().from(menuItemsTable).delete().eq('id', id).select('id').single()
  if (error || !data) {
    throw new ApiError(404, 'Menu item not found')
  }
}