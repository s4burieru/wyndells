import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  ensureWelcome,
  listNotifications,
  markAllRead,
  setRead,
  unreadCount,
} from '../services/notification.service'
import { assertUuid } from '../utils/validate'
import type { AuthedRequest } from '../middleware/auth'

/**
 * Notifications are always scoped to `req.user.id` — there is no route that
 * lets one staff member read another's inbox.
 */

export const listNotificationsController = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user.id
    // Self-healing: an account that has never been notified gets its first
    // item here rather than needing a data-fix script.
    await ensureWelcome(userId)
    const limit = req.query.limit ? Number(req.query.limit) : 30
    const result = await listNotifications(userId, Number.isFinite(limit) ? limit : 30)
    res.json(result)
  },
)

export const unreadCountController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json({ unread: await unreadCount(req.user.id) })
})

export const markReadController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const notification = await setRead(assertUuid(String(req.params.id), 'notification'), req.user.id, true)
  res.json({ notification })
})

export const markUnreadController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const notification = await setRead(
    assertUuid(String(req.params.id), 'notification'),
    req.user.id,
    false,
  )
  res.json({ notification })
})

export const markAllReadController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json({ updated: await markAllRead(req.user.id) })
})
