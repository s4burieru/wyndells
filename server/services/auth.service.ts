import bcrypt from 'bcryptjs'
import { UserModel } from '../models/User'
import { BranchModel } from '../models/Branch'
import { ApiError } from '../utils/ApiError'
import { signToken, type AuthUser } from '../middleware/auth'

export type SafeUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager'
  isActive: boolean
  assignedBranch: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

const SALT_ROUNDS = 10

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

type UserLikeInput = {
  _id: unknown
  name: string
  email: string
  role: 'admin' | 'manager'
  isActive: boolean
  assignedBranch?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

/** Maps a user document (and optionally a branch name) to the safe public shape. */
function toSafeUser(user: UserLikeInput, branchNames: Map<string, string>): SafeUser {
  const branchId = user.assignedBranch ? String(user.assignedBranch) : null
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    assignedBranch: branchId ? { id: branchId, name: branchNames.get(branchId) ?? 'Unknown branch' } : null,
    createdAt: toIso(user.createdAt),
    updatedAt: toIso(user.updatedAt),
  }
}

export async function buildSafeUser(userId: string): Promise<SafeUser> {
  const user = await UserModel.findById(userId)
  if (!user) {
    throw new ApiError(404, 'User not found')
  }
  let branchName = 'Unknown branch'
  let branchId: string | null = null
  if (user.assignedBranch) {
    branchId = String(user.assignedBranch)
    const branch = await BranchModel.findById(branchId).select('name').lean()
    branchName = branch?.name ?? branchName
  }
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    assignedBranch: branchId ? { id: branchId, name: branchName } : null,
    createdAt: toIso(user.createdAt),
    updatedAt: toIso(user.updatedAt),
  }
}

export async function login(email: string, password: string): Promise<{ token: string; user: SafeUser }> {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.')
  }

  const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).select('+password')
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.')
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password.')
  }

  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated. Please contact an administrator.')
  }

  const authUser: AuthUser = {
    id: String(user._id),
    role: user.role,
    branch: user.assignedBranch ? String(user.assignedBranch) : null,
  }

  return { token: signToken(authUser), user: await buildSafeUser(String(user._id)) }
}

/** Batch loader used by the user list endpoint (avoids one query per user). */
export async function buildSafeUsers(users: UserLikeInput[]): Promise<SafeUser[]> {
  const branchIds = users
    .map((user) => (user.assignedBranch ? String(user.assignedBranch) : null))
    .filter((id): id is string => id !== null)
  const branchNames = new Map<string, string>()
  if (branchIds.length > 0) {
    const branches = await BranchModel.find({ _id: { $in: branchIds } }).select('name').lean()
    for (const branch of branches) {
      branchNames.set(String(branch._id), branch.name)
    }
  }
  return users.map((user) => toSafeUser(user, branchNames))
}