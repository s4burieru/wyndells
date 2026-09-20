import { randomUUID } from 'node:crypto'
import { getDb } from '../config/db'
import { usersTable } from '../models/User'
import { branchesTable } from '../models/Branch'
import { ApiError, isDuplicateKeyError } from '../utils/ApiError'
import { pickFields } from '../utils/pick'
import { assertEmail, assertPhone, assertUuid, requireFields } from '../utils/validate'
import {
  MAX_AVATAR_URL_LENGTH,
  MAX_BIO_LENGTH,
  MAX_NAME_LENGTH,
  MAX_POSITION_LENGTH,
  MAX_PROFILE_TEXT_LENGTH,
  USER_ROLES,
  type UserRole,
} from '../constants'
import { buildSafeUsers, hashPassword, USER_SELECT, type SafeUser } from './auth.service'
import { deleteStoredAvatar, uploadAvatar, type AvatarUpload } from './avatar.service'

const USER_EDITABLE_FIELDS = [
  'name',
  'email',
  'password',
  'role',
  'assignedBranch',
  'isActive',
  'position',
  'contactNumber',
  'address',
  'avatarUrl',
  'bio',
]

/**
 * Fields a staff member may change on their own profile. Role, branch
 * assignment, email, password and activation stay admin-only.
 */
const PROFILE_EDITABLE_FIELDS = ['name', 'position', 'contactNumber', 'address', 'avatarUrl', 'bio']

const HTTP_URL_PATTERN = /^https?:\/\/\S+$/i

/** Trims an optional profile value and enforces its length limit. */
function profileText(value: unknown, label: string, maxLength: number): string {
  const text = String(value ?? '').trim()
  if (text.length > maxLength) {
    throw new ApiError(400, `${label} must be ${maxLength} characters or fewer.`)
  }
  return text
}

/** Empty is allowed; anything else must be a link the browser can load. */
function assertAvatarUrl(value: string): void {
  if (value !== '' && !HTTP_URL_PATTERN.test(value)) {
    throw new ApiError(400, 'Avatar image must be a valid http(s) image URL.')
  }
}

/** Booleans arrive as booleans in JSON but as strings over multipart form data. */
function toBoolean(value: unknown): boolean {
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase())
  }
  return Boolean(value)
}

/** The photo side of a profile update: the new value plus any file to discard. */
type AvatarPlan = {
  /** New `avatar_url` value, or undefined when the photo is left untouched. */
  url: string | undefined
  /** Previously stored photo that became unreferenced (deleted after the save). */
  purge: string
}

/**
 * Works out the photo side of a profile update. An uploaded file always wins
 * over the `avatarUrl` field, and an empty `avatarUrl` clears the photo. The
 * replaced file is only *reported* here — it is deleted once the row update has
 * been stored, so a failed save never loses the current photo.
 */
async function planAvatarChange(
  ownerKey: string,
  existingAvatarUrl: string,
  requestedAvatarUrl: unknown,
  upload: AvatarUpload | undefined,
): Promise<AvatarPlan> {
  if (upload) {
    return { url: await uploadAvatar(ownerKey, upload), purge: existingAvatarUrl }
  }
  if (requestedAvatarUrl === undefined) {
    return { url: undefined, purge: '' }
  }
  const next = String(requestedAvatarUrl).trim()
  return { url: undefined, purge: next === existingAvatarUrl ? '' : existingAvatarUrl }
}

/**
 * Maps the profile fields of a payload onto `users` columns. Undefined fields
 * are skipped so partial updates keep the stored values.
 */
function profileColumnUpdates(payload: Record<string, unknown>): Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  if (payload.position !== undefined) {
    updates.position = profileText(payload.position, 'Job title', MAX_POSITION_LENGTH)
  }
  if (payload.contactNumber !== undefined) {
    const contactNumber = profileText(payload.contactNumber, 'Contact number', MAX_PROFILE_TEXT_LENGTH)
    if (contactNumber !== '') {
      assertPhone(contactNumber)
    }
    updates.contact_number = contactNumber
  }
  if (payload.address !== undefined) {
    updates.address = profileText(payload.address, 'Address', MAX_PROFILE_TEXT_LENGTH)
  }
  if (payload.avatarUrl !== undefined) {
    // An empty value clears the photo; an uploaded file overrides this link
    // (see planAvatarChange).
    const avatarUrl = profileText(payload.avatarUrl, 'Avatar image URL', MAX_AVATAR_URL_LENGTH)
    assertAvatarUrl(avatarUrl)
    updates.avatar_url = avatarUrl
  }
  if (payload.bio !== undefined) {
    updates.bio = profileText(payload.bio, 'Bio', MAX_BIO_LENGTH)
  }
  return updates
}

async function assertAssignedBranch(role: string, branchId: unknown): Promise<void> {
  if (role !== 'manager') {
    return
  }
  const value = branchId === undefined || branchId === null || branchId === '' ? null : String(branchId)
  if (!value) {
    throw new ApiError(400, 'A manager must be assigned to a branch.')
  }
  assertUuid(value, 'branch')
  const { data: branch, error } = await getDb()
    .from(branchesTable)
    .select('id')
    .eq('id', value)
    .maybeSingle()
  if (error || !branch) {
    throw new ApiError(400, 'The assigned branch does not exist.')
  }
}

async function fetchSafeUser(userId: string): Promise<SafeUser> {
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

export async function listUsers(role?: string): Promise<SafeUser[]> {
  let query = getDb().from(usersTable).select(USER_SELECT)
  if (role) {
    query = query.eq('role', role as 'admin' | 'manager')
  }
  const { data: users, error } = await query.order('created_at', { ascending: false }).limit(250)
  if (error) {
    throw new ApiError(500, 'Could not load users.')
  }
  return buildSafeUsers(users ?? [])
}

/**
 * Creates a staff account. A photo attached to the request is stored first and
 * rolled back if the account cannot be saved, so no orphan files pile up.
 */
export async function createUser(
  payload: Record<string, unknown>,
  upload?: AvatarUpload,
): Promise<SafeUser> {
  requireFields(payload, ['name', 'email', 'password', 'role'])
  const role = String(payload.role)
  if (!USER_ROLES.includes(role as UserRole)) {
    throw new ApiError(400, 'Role must be either "admin" or "manager".')
  }
  const roleValue = role as 'admin' | 'manager'
  const name = profileText(payload.name, 'Full name', MAX_NAME_LENGTH)
  assertEmail(String(payload.email))
  const password = String(payload.password)
  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long.')
  }
  await assertAssignedBranch(role, payload.assignedBranch)

  // The account does not exist yet, so its photo gets its own folder key.
  const avatarUrl = upload ? await uploadAvatar(randomUUID(), upload) : ''

  const { data: inserted, error } = await getDb()
    .from(usersTable)
    .insert({
      name,
      email: String(payload.email).trim().toLowerCase(),
      password_hash: await hashPassword(password),
      role: roleValue,
      assigned_branch_id: payload.assignedBranch ? String(payload.assignedBranch) : null,
      is_active: payload.isActive === undefined ? true : toBoolean(payload.isActive),
      ...profileColumnUpdates(payload),
      // An uploaded photo always wins over an `avatarUrl` link in the payload.
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .select('id')
    .single()
  if (error) {
    if (avatarUrl) {
      await deleteStoredAvatar(avatarUrl)
    }
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, 'A user with this email already exists.')
    }
    throw new ApiError(500, 'Could not create the user.')
  }
  return fetchSafeUser(inserted.id)
}

/**
 * Admin update of any staff account. An attached photo replaces the current
 * one, and the replaced file is deleted once the change has been stored.
 */
export async function updateUser(
  id: string,
  payload: Record<string, unknown>,
  upload?: AvatarUpload,
): Promise<SafeUser> {
  assertUuid(id, 'user')
  const existing = await fetchSafeUser(id)

  const updates = pickFields(payload, USER_EDITABLE_FIELDS)
  const rowUpdates: Record<string, unknown> = {}

  if (updates.name !== undefined) {
    const name = profileText(updates.name, 'Full name', MAX_NAME_LENGTH)
    if (name === '') {
      throw new ApiError(400, 'Full name is required.')
    }
    rowUpdates.name = name
  }
  if (updates.email !== undefined) {
    assertEmail(String(updates.email))
    rowUpdates.email = String(updates.email).trim().toLowerCase()
  }
  if (updates.password !== undefined) {
    const password = String(updates.password)
    if (password.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters long.')
    }
    rowUpdates.password_hash = await hashPassword(password)
  }
  if (updates.role !== undefined) {
    const role = String(updates.role)
    if (!USER_ROLES.includes(role as UserRole)) {
      throw new ApiError(400, 'Role must be either "admin" or "manager".')
    }
    rowUpdates.role = role as 'admin' | 'manager'
  }
  if (updates.assignedBranch !== undefined) {
    const value = updates.assignedBranch === null || updates.assignedBranch === '' ? null : String(updates.assignedBranch)
    rowUpdates.assigned_branch_id = value
  }
  if (updates.isActive !== undefined) {
    rowUpdates.is_active = toBoolean(updates.isActive)
  }
  if (updates.role !== undefined || updates.assignedBranch !== undefined) {
    const role = updates.role !== undefined ? String(updates.role) : existing.role
    const branchId =
      updates.assignedBranch !== undefined ? updates.assignedBranch : existing.assignedBranch?.id
    await assertAssignedBranch(role, branchId)
  }

  // Profile details (job title, contact number, address, avatar, bio).
  Object.assign(rowUpdates, profileColumnUpdates(updates))
  const avatar = await planAvatarChange(id, existing.avatarUrl, updates.avatarUrl, upload)
  if (avatar.url !== undefined) {
    rowUpdates.avatar_url = avatar.url
  }

  const { error } = await getDb().from(usersTable).update(rowUpdates).eq('id', id)
  if (error) {
    // A photo uploaded for a save that failed must not stay in storage.
    if (avatar.url !== undefined) {
      await deleteStoredAvatar(avatar.url)
    }
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, 'A user with this email already exists.')
    }
    throw new ApiError(500, 'Could not update the user.')
  }
  // Only once the new photo is safely stored does the old one go away.
  await deleteStoredAvatar(avatar.purge)
  return fetchSafeUser(id)
}

/**
 * Self-service profile update for the signed-in staff member. Only profile
 * fields are accepted (see PROFILE_EDITABLE_FIELDS), so a manager can keep
 * their own details current without touching role, branch or access status.
 */
export async function updateOwnProfile(
  id: string,
  payload: Record<string, unknown>,
  upload?: AvatarUpload,
): Promise<SafeUser> {
  assertUuid(id, 'user')
  const existing = await fetchSafeUser(id)
  const updates = pickFields(payload, PROFILE_EDITABLE_FIELDS)
  const rowUpdates = profileColumnUpdates(updates)

  if (updates.name !== undefined) {
    const name = profileText(updates.name, 'Full name', MAX_NAME_LENGTH)
    if (name === '') {
      throw new ApiError(400, 'Full name is required.')
    }
    rowUpdates.name = name
  }
  // The photo may come as an uploaded file, a link, or an empty value (remove).
  const avatar = await planAvatarChange(id, existing.avatarUrl, updates.avatarUrl, upload)
  if (avatar.url !== undefined) {
    rowUpdates.avatar_url = avatar.url
  }
  if (Object.keys(rowUpdates).length === 0) {
    throw new ApiError(400, 'No profile changes were provided.')
  }

  const { error } = await getDb().from(usersTable).update(rowUpdates).eq('id', id)
  if (error) {
    // A photo uploaded for a save that failed must not stay in storage.
    if (avatar.url !== undefined) {
      await deleteStoredAvatar(avatar.url)
    }
    throw new ApiError(500, 'Could not update your profile.')
  }
  // Only once the new photo is safely stored does the old one go away.
  await deleteStoredAvatar(avatar.purge)
  return fetchSafeUser(id)
}

export async function setUserActive(id: string, isActive: boolean): Promise<SafeUser> {
  assertUuid(id, 'user')
  const { error } = await getDb().from(usersTable).update({ is_active: isActive }).eq('id', id)
  if (error) {
    throw new ApiError(404, 'User not found')
  }
  return fetchSafeUser(id)
}

export async function deleteUser(id: string): Promise<void> {
  assertUuid(id, 'user')
  const existing = await fetchSafeUser(id)
  if (existing.role === 'admin') {
    throw new ApiError(400, 'Administrator accounts cannot be deleted.')
  }
  const { data, error } = await getDb().from(usersTable).delete().eq('id', id).select('id').single()
  if (error || !data) {
    throw new ApiError(404, 'User not found')
  }
  // The account is gone, so its stored profile photo would be orphaned.
  await deleteStoredAvatar(existing.avatarUrl)
}