import bcrypt from 'bcryptjs'
import { getDb } from '../config/database'
import { usersTable } from '../models/User'
import { ApiError } from '../utils/ApiError'
import { signToken, type AuthUser } from '../middleware/auth'
import type { UserRole } from '../constants'
import type { Permission } from '../constants/permissions'
import { getRolePermissions } from './permission.service'

export type SafeUser = {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  assignedBranch: { id: string; name: string } | null
  /** Profile details managed from the admin "Users & Managers" page / own profile. */
  position: string
  contactNumber: string
  address: string
  avatarUrl: string
  bio: string
  /** What this account's role may currently do — drives every client-side gate. */
  permissions: Permission[]
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
  role: UserRole
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
function toSafeUser(user: UserLikeInput): Omit<SafeUser, 'permissions'> {
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
  return (await buildSafeUsers([user]))[0]
}

/**
 * Shown to a visitor whose Google identity is valid but who has no active
 * portal account. Google sign-in never registers anybody.
 */
export const GOOGLE_NOT_AUTHORIZED_MESSAGE =
  'Your Google account is not authorized to access this portal. Please contact an administrator.'

/**
 * Issues the portal session for an authorized user row: the app JWT (carrying
 * id, role and branch, so every downstream permission check keeps working) plus
 * the safe public profile.
 */
async function issueSession(user: UserLikeInput): Promise<{ token: string; user: SafeUser }> {
  // The login response seeds the client's permission checks, so it must carry
  // the real grants rather than waiting for the first /me round-trip.
  const permissions = await getRolePermissions(user.role)
  const authUser: AuthUser = {
    id: user.id,
    role: user.role,
    branch: user.assigned_branch_id ?? null,
    permissions,
  }
  return { token: signToken(authUser), user: { ...toSafeUser(user), permissions } }
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

  return issueSession(user)
}

/**
 * Signs in a staff member through Google (Supabase Auth's Google provider).
 *
 * The browser only ever hands over the Supabase access token it received from
 * Google; everything that decides access happens here:
 *
 * 1. Supabase Auth validates the token and returns the identity behind it.
 * 2. The identity must come from Google with a confirmed email address.
 * 3. The email must already exist in the `users` table — an unknown Google
 *    account is rejected, never registered.
 * 4. The matching account must still be active.
 *
 * Only then does the API hand out its own JWT, so role and branch permissions
 * keep being enforced by `authenticateUser` on every later request.
 */
export async function loginWithGoogle(accessToken: string): Promise<{ token: string; user: SafeUser }> {
  if (!accessToken) {
    throw new ApiError(400, 'A Google access token is required.')
  }

  const { data, error } = await getDb().auth.getUser(accessToken)
  const identity = data?.user
  if (error || !identity) {
    // The reason (expired or revoked session, wrong project, …) is logged for
    // operators only — the browser just gets the friendly message.
    console.error(`Google sign-in token rejected: ${error?.message ?? 'no identity returned'}`)
    throw new ApiError(401, 'We could not verify your Google sign-in. Please try again.')
  }

  const metadata = (identity.app_metadata ?? {}) as { provider?: string; providers?: string[] }
  const providers = metadata.providers ?? (metadata.provider ? [metadata.provider] : [])
  const email = identity.email?.trim().toLowerCase() ?? ''
  const emailConfirmed = Boolean(identity.email_confirmed_at ?? identity.confirmed_at)
  if (!providers.includes('google') || !email || !emailConfirmed) {
    throw new ApiError(403, GOOGLE_NOT_AUTHORIZED_MESSAGE)
  }

  const { data: user, error: lookupError } = await getDb()
    .from(usersTable)
    .select(USER_SELECT)
    .eq('email', email)
    .maybeSingle()
  if (lookupError) {
    throw new ApiError(503, 'We could not check your account right now. Please try again.')
  }
  if (!user) {
    throw new ApiError(403, GOOGLE_NOT_AUTHORIZED_MESSAGE)
  }

  if (!user.is_active) {
    throw new ApiError(403, 'This account has been deactivated. Please contact an administrator.')
  }

  return issueSession(user)
}

/** Maps user rows (already carrying their embedded branch name) to the safe public shape. */
export async function buildSafeUsers(users: UserLikeInput[]): Promise<SafeUser[]> {
  // Permissions are per role, so one lookup serves the whole batch.
  const permissionsByRole = new Map<UserRole, Permission[]>()
  await Promise.all(
    [...new Set(users.map((user) => user.role))].map(async (role) => {
      permissionsByRole.set(role, await getRolePermissions(role))
    }),
  )
  return users.map((user) => ({
    ...toSafeUser(user),
    permissions: permissionsByRole.get(user.role) ?? [],
  }))
}
