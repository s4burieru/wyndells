export const branchesTable = 'branches'

/** Row shape as stored in the Supabase `branches` table. */
export type BranchRow = {
  id: string
  name: string
  code: string
  address: string
  city: string
  contact_number: string
  email: string
  hours: string
  description: string
  image: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type BranchRefRow = Pick<BranchRow, 'id' | 'name' | 'code'>
export type BranchRefRowWithAddress = BranchRefRow & { address?: string }

/** Branch reference object embedded in other resources (mirrors the old populate). */
export type BranchRef = { _id: string; name: string; code: string }

/** Public JSON shape returned to the client (mirrors the previous Mongoose document). */
export type Branch = {
  _id: string
  name: string
  code: string
  address: string
  city: string
  contactNumber: string
  email: string
  hours: string
  description: string
  image: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function toBranchRef(row: BranchRefRow): BranchRef {
  return { _id: row.id, name: row.name, code: row.code }
}

export function toBranch(row: BranchRow): Branch {
  return {
    _id: row.id,
    name: row.name,
    code: row.code,
    address: row.address,
    city: row.city,
    contactNumber: row.contact_number,
    email: row.email,
    hours: row.hours,
    description: row.description,
    image: row.image,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}