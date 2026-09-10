import { BranchModel } from '../models/Branch'
import { ApiError, isDuplicateKeyError } from '../utils/ApiError'
import { pickFields } from '../utils/pick'
import { assertObjectId, requireFields } from '../utils/validate'

const BRANCH_EDITABLE_FIELDS = [
  'name',
  'code',
  'address',
  'city',
  'contactNumber',
  'email',
  'hours',
  'description',
  'image',
  'isActive',
]

export async function listBranches(includeInactive = false) {
  const filter = includeInactive ? {} : { isActive: true }
  return BranchModel.find(filter).sort({ name: 1 }).lean()
}

export async function getBranch(id: string) {
  assertObjectId(id, 'branch')
  const branch = await BranchModel.findById(id).lean()
  if (!branch) {
    throw new ApiError(404, 'Branch not found')
  }
  return branch
}

export async function createBranch(payload: Record<string, unknown>) {
  requireFields(payload, ['name', 'code'])
  const updates = pickFields(payload, BRANCH_EDITABLE_FIELDS)
  const code = String(updates.code).trim().toLowerCase()
  updates.code = code
  updates.name = String(updates.name).trim()

  if (await BranchModel.exists({ code })) {
    throw new ApiError(409, `A branch with the code "${code}" already exists.`)
  }

  try {
    return await BranchModel.create(updates)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, `A branch with the code "${code}" already exists.`)
    }
    throw error
  }
}

export async function updateBranch(id: string, payload: Record<string, unknown>) {
  assertObjectId(id, 'branch')
  const updates = pickFields(payload, BRANCH_EDITABLE_FIELDS)
  if (updates.code !== undefined) {
    updates.code = String(updates.code).trim().toLowerCase()
  }
  if (updates.name !== undefined) {
    updates.name = String(updates.name).trim()
  }

  try {
    const branch = await BranchModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
    if (!branch) {
      throw new ApiError(404, 'Branch not found')
    }
    return branch
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, `A branch with the code "${updates.code}" already exists.`)
    }
    throw error
  }
}

export async function setBranchActive(id: string, isActive: boolean) {
  assertObjectId(id, 'branch')
  const branch = await BranchModel.findByIdAndUpdate(id, { isActive }, { new: true })
  if (!branch) {
    throw new ApiError(404, 'Branch not found')
  }
  return branch
}

export async function deleteBranch(id: string): Promise<void> {
  assertObjectId(id, 'branch')
  const branch = await BranchModel.findByIdAndDelete(id)
  if (!branch) {
    throw new ApiError(404, 'Branch not found')
  }
}