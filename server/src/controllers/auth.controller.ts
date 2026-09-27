import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { login, loginWithGoogle, buildSafeUser } from '../services/auth.service'
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

/**
 * Exchanges a Google (Supabase Auth) access token for a portal session. The
 * token is verified server-side and the account is authorized against the
 * `users` table — the frontend never decides who gets in.
 */
export const googleLoginController = asyncHandler(async (req, res: Response) => {
  const body = req.body as { accessToken?: unknown }
  const { token, user } = await loginWithGoogle(body.accessToken ? String(body.accessToken) : '')
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