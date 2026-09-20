import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  createUser,
  deleteUser,
  listUsers,
  setUserActive,
  updateUser,
} from '../services/user.service'
import type { AuthedRequest } from '../middleware/auth'
import { uploadedAvatar } from '../middleware/uploads'

export const listUsersController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const role = req.query.role ? String(req.query.role) : undefined
  const users = await listUsers(role)
  res.json({ users })
})

export const createUserController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await createUser(req.body as Record<string, unknown>, uploadedAvatar(req))
  res.status(201).json({ user })
})

export const updateUserController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await updateUser(
    String(req.params.id),
    req.body as Record<string, unknown>,
    uploadedAvatar(req),
  )
  res.json({ user })
})

export const setUserActiveController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const isActive = String(req.body?.isActive ?? '').toLowerCase() === 'true'
  const user = await setUserActive(String(req.params.id), isActive)
  res.json({ user })
})

export const deleteUserController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await deleteUser(String(req.params.id))
  res.json({ message: 'User deleted' })
})