import { getDb } from '../config/db'
import { usersTable } from '../models/User'
import { branchesTable } from '../models/Branch'
import { ApiError, isDuplicateKeyError } from '../utils/ApiError'
import { pickFields } from '../utils/pick'
import { assertEmail, assertUuid, requireFields } from '../utils/validate'
import { USER_ROLES, type UserRole } from '../constants'
import { buildSafeUsers, hashPassword, USER_SELECT, type SafeUser } from './auth.service'

const USER_EDITABLE_FIELDS = ['name', 'email', 'password', 'role', 'assignedBranch', 'isActive']

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

export async function createUser(payload: Record<string, unknown>): Promise<SafeUser> {
  requireFields(payload, ['name', 'email', 'password', 'role'])
  const role = String(payload.role)
  if (!USER_ROLES.includes(role as UserRole)) {
    throw new ApiError(400, 'Role must be either "admin" or "manager".')
  }
  const roleValue = role as 'admin' | 'manager'
  assertEmail(String(payload.email))
  const password = String(payload.password)
  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long.')
  }
  await assertAssignedBranch(role, payload.assignedBranch)

  const { data: inserted, error } = await getDb()
    .from(usersTable)
    .insert({
      name: String(payload.name).trim(),
      email: String(payload.email).trim().toLowerCase(),
      password_hash: await hashPassword(password),
      role: roleValue,
      assigned_branch_id: payload.assignedBranch ? String(payload.assignedBranch) : null,
      is_active: payload.isActive === undefined ? true : Boolean(payload.isActive),
    })
    .select('id')
    .single()
  if (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, 'A user with this email already exists.')
    }
    throw new ApiError(500, 'Could not create the user.')
  }
  return fetchSafeUser(inserted.id)
}

export async function updateUser(id: string, payload: Record<string, unknown>): Promise<SafeUser> {
  assertUuid(id, 'user')
  const existing = await fetchSafeUser(id)

  const updates = pickFields(payload, USER_EDITABLE_FIELDS)
  const rowUpdates: Record<string, unknown> = {}

  if (updates.name !== undefined) {
    rowUpdates.name = String(updates.name).trim()
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
    rowUpdates.is_active = Boolean(updates.isActive)
  }
  if (updates.role !== undefined || updates.assignedBranch !== undefined) {
    const role = updates.role !== undefined ? String(updates.role) : existing.role
    const branchId =
      updates.assignedBranch !== undefined ? updates.assignedBranch : existing.assignedBranch?.id
    await assertAssignedBranch(role, branchId)
  }

  const { error } = await getDb().from(usersTable).update(rowUpdates).eq('id', id)
  if (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, 'A user with this email already exists.')
    }
    throw new ApiError(500, 'Could not update the user.')
  }
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
}