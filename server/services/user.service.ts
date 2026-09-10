import { UserModel } from '../models/User'
import { BranchModel } from '../models/Branch'
import { ApiError, isDuplicateKeyError } from '../utils/ApiError'
import { pickFields } from '../utils/pick'
import { assertEmail, assertObjectId, requireFields } from '../utils/validate'
import { USER_ROLES, type UserRole } from '../constants'
import { buildSafeUsers, hashPassword, type SafeUser } from './auth.service'

const USER_EDITABLE_FIELDS = ['name', 'email', 'password', 'role', 'assignedBranch', 'isActive']

async function assertAssignedBranch(role: string, branchId: unknown): Promise<void> {
  if (role !== 'manager') {
    return
  }
  const value = branchId === undefined || branchId === null || branchId === '' ? null : String(branchId)
  if (!value) {
    throw new ApiError(400, 'A manager must be assigned to a branch.')
  }
  assertObjectId(value, 'branch')
  const branch = await BranchModel.exists({ _id: value })
  if (!branch) {
    throw new ApiError(400, 'The assigned branch does not exist.')
  }
}

export async function listUsers(role?: string): Promise<SafeUser[]> {
  const query = role ? { role: role as 'admin' | 'manager' } : {}
  const users = await UserModel.find(query).sort({ createdAt: -1 }).limit(250)
  return buildSafeUsers(users)
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

  const user = await UserModel.create({
    name: String(payload.name).trim(),
    email: String(payload.email).trim().toLowerCase(),
    password: await hashPassword(password),
    role: roleValue,
    assignedBranch: payload.assignedBranch ? String(payload.assignedBranch) : null,
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
  })
  return buildSafeUsersWithOne(String(user._id))
}

async function buildSafeUsersWithOne(userId: string): Promise<SafeUser> {
  const user = await UserModel.findById(userId)
  if (!user) {
    throw new ApiError(404, 'User not found')
  }
  return (await buildSafeUsers([user]))[0]
}

export async function updateUser(id: string, payload: Record<string, unknown>): Promise<SafeUser> {
  assertObjectId(id, 'user')
  const existing = await UserModel.findById(id)
  if (!existing) {
    throw new ApiError(404, 'User not found')
  }

  const updates = pickFields(payload, USER_EDITABLE_FIELDS)

  if (updates.email !== undefined) {
    assertEmail(String(updates.email))
    updates.email = String(updates.email).trim().toLowerCase()
  }
  if (updates.password !== undefined) {
    const password = String(updates.password)
    if (password.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters long.')
    }
    updates.password = await hashPassword(password)
  }
  if (updates.role !== undefined) {
    const role = String(updates.role)
    if (!USER_ROLES.includes(role as UserRole)) {
      throw new ApiError(400, 'Role must be either "admin" or "manager".')
    }
  }
  if (updates.role !== undefined || updates.assignedBranch !== undefined) {
    const role = updates.role !== undefined ? String(updates.role) : existing.role
    await assertAssignedBranch(role, updates.assignedBranch !== undefined ? updates.assignedBranch : existing.assignedBranch)
  }

  try {
    const user = await UserModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
    if (!user) {
      throw new ApiError(404, 'User not found')
    }
    return buildSafeUsersWithOne(String(user._id))
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, 'A user with this email already exists.')
    }
    throw error
  }
}

export async function setUserActive(id: string, isActive: boolean): Promise<SafeUser> {
  assertObjectId(id, 'user')
  const user = await UserModel.findByIdAndUpdate(id, { isActive }, { new: true })
  if (!user) {
    throw new ApiError(404, 'User not found')
  }
  return buildSafeUsersWithOne(String(user._id))
}

export async function deleteUser(id: string): Promise<void> {
  assertObjectId(id, 'user')
  const user = await UserModel.findById(id)
  if (!user) {
    throw new ApiError(404, 'User not found')
  }
  if (user.role === 'admin') {
    throw new ApiError(400, 'Administrator accounts cannot be deleted.')
  }
  await UserModel.deleteOne({ _id: id })
}