import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { login, buildSafeUser } from '../services/auth.service'
import type { AuthedRequest } from '../middleware/auth'

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