import type { MenuCategory } from '../constants'
import { toBranchRef, type BranchRef, type BranchRefRow } from './Branch'

export const menuItemsTable = 'menu_items'

/** Row shape as stored in the Supabase `menu_items` table. */
export type MenuItemRow = {
  id: string
  branch_id: string
  name: string
  description: string
  price: number
  category: MenuCategory
  image: string
  status: 'available' | 'unavailable'
  is_featured: boolean
  created_at: string
  updated_at: string
}

export type MenuItemWithBranchRow = MenuItemRow & { branch: BranchRefRow }

/** Public JSON shape returned to the client (mirrors the previous Mongoose document). */
export type MenuItem = {
  _id: string
  branch: BranchRef | string
  name: string
  description: string
  price: number
  category: MenuCategory
  image: string
  status: 'available' | 'unavailable'
  isFeatured: boolean
  createdAt: string
  updatedAt: string
}

/** Serializes a raw menu row with `branch` as the plain branch id (no populate). */
export function toMenuItem(row: MenuItemRow): Omit<MenuItem, 'branch'> & { branch: string } {
  return {
    _id: row.id,
    branch: row.branch_id,
    name: row.name,
    description: row.description,
    price: row.price,
    category: row.category,
    image: row.image,
    status: row.status,
    isFeatured: row.is_featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Serializes a menu row that came with the embedded `branch` reference. */
export function toMenuItemWithBranch(row: MenuItemWithBranchRow): MenuItem {
  return { ...toMenuItem(row), branch: toBranchRef(row.branch) }
}