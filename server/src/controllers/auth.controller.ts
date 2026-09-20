import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { login, buildSafeUser } from '../services/auth.service'
import { updateOwnProfile } from '../services/user.service'
import type { AuthedRequest } from '../middleware/auth'
import { uploadedAvatar } from '../middleware/uploads'

export const loginController = asyncHandler(async (req, res) => {
  const body = req.body as { email?: unknown; password?: unknown }
  const { token, user } = await login(
    body.email ? String(body.email) : '',
    body.password ? String(body.password) : '',
  )
  res.json({ token, user })
})

export const meController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await buildSafeUser(req.user.id)
  res.json({ user })
})

/** Lets the signed-in staff member keep their own profile details up to date. */
export const updateProfileController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await updateOwnProfile(
    req.user.id,
    req.body as Record<string, unknown>,
    uploadedAvatar(req),
  )
  res.json({ user })
})