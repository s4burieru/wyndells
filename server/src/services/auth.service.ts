import bcrypt from 'bcryptjs'
import { getDb } from '../config/db'
import { usersTable } from '../models/User'
import { ApiError } from '../utils/ApiError'
import { signToken, type AuthUser } from '../middleware/auth'

export type SafeUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager'
  isActive: boolean
  assignedBranch: { id: string; name: string } | null
  /** Profile details managed from the admin "Users & Managers" page / own profile. */
  position: string
  contactNumber: string
  address: string
  avatarUrl: string
  bio: string
  createdAt: string
  updatedAt: string
}

const SALT_ROUNDS = 10

/** Shared column list (without the password hash) used by every user read. */
const USER_COLUMNS =
  'id, name, email, role, assigned_branch_id, is_active, position, contact_number, address, avatar_url, bio, created_at, updated_at'

/**
 * Select string used for all user reads. Always embeds the assigned branch
 * name (via the `assigned_branch` foreign key) so branch names never need a
 * second query. `password_hash` is deliberately excluded — it is only selected
 * in the login flow.
 */
export const USER_SELECT = `${USER_COLUMNS}, assigned_branch:assigned_branch_id(name)`

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

function toIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value).toISOString()
  }
  return ''
}

/**
 * PostgREST embeds a to-one relation as an object, but the untyped supabase-js
 * client statically models embedded relations as arrays. Accept both so the
 * wiring is future-proof.
 */
type AssignedBranchRef = { name: string } | readonly { name: string }[]

type UserLikeInput = {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager'
  is_active: boolean
  assigned_branch_id?: string | null
  assigned_branch?: AssignedBranchRef | null
  position?: unknown
  contact_number?: unknown
  address?: unknown
  avatar_url?: unknown
  bio?: unknown
  created_at?: unknown
  updated_at?: unknown
}

/** Profile columns are stored as `not null default ''`; coerce defensively. */
function toProfileText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function embeddedBranchName(user: UserLikeInput): string | null {
  const value = user.assigned_branch
  if (!value) {
    return null
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? (value[0].name ?? null) : null
  }
  return (value as { name: string }).name ?? null
}

/** Maps a Supabase user row (with embedded branch name) to the safe public shape. */
function toSafeUser(user: UserLikeInput): SafeUser {
  const branchId = user.assigned_branch_id ? String(user.assigned_branch_id) : null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    assignedBranch: branchId ? { id: branchId, name: embeddedBranchName(user) ?? 'Unknown branch' } : null,
    position: toProfileText(user.position),
    contactNumber: toProfileText(user.contact_number),
    address: toProfileText(user.address),
    avatarUrl: toProfileText(user.avatar_url),
    bio: toProfileText(user.bio),
    createdAt: toIso(user.created_at),
    updatedAt: toIso(user.updated_at),
  }
}

export async function buildSafeUser(userId: string): Promise<SafeUser> {
  const { data: user, error } = await getDb()
    .from(usersTable)
    .select(USER_SELECT)
    .eq('id', userId)
    .maybeSingle()
  if (error || !user) {
    throw new ApiError(404, 'User not found')
  }
  return toSafeUser(user)
}

export async function login(email: string, password: string): Promise<{ token: string; user: SafeUser }> {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.')
  }

  const { data: user, error } = await getDb()
    .from(usersTable)
    .select(`${USER_COLUMNS}, password_hash, assigned_branch:assigned_branch_id(name)`)
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()
  if (error || !user) {
    throw new ApiError(401, 'Invalid email or password.')
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password.')
  }

  if (!user.is_active) {
    throw new ApiError(403, 'This account has been deactivated. Please contact an administrator.')
  }

  const authUser: AuthUser = {
    id: user.id,
    role: user.role,
    branch: user.assigned_branch_id,
  }

  return { token: signToken(authUser), user: toSafeUser(user) }
}

/** Maps user rows (already carrying their embedded branch name) to the safe public shape. */
export async function buildSafeUsers(users: UserLikeInput[]): Promise<SafeUser[]> {
  return users.map((user) => toSafeUser(user))
}