import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { deleteSubscriber, listSubscribers, subscribeNewsletter } from '../services/newsletter.service'
import type { AuthedRequest } from '../middleware/auth'

function clientKey(req: Request): string {
  return `${req.ip ?? 'unknown'}|${req.headers['user-agent'] ?? ''}`
}

// Public ------------------------------------------------------------------

export const subscribeNewsletterController = asyncHandler(async (req: Request, res: Response) => {
  const result = await subscribeNewsletter(req.body as Record<string, unknown>, clientKey(req))
  if (result.alreadySubscribed) {
    res.status(200).json({ subscriber: { email: result.subscriber.email }, alreadySubscribed: true })
    return
  }
  res.status(201).json({ subscriber: { email: result.subscriber.email }, alreadySubscribed: false })
})

// Staff -------------------------------------------------------------------

export const listSubscribersController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const search = req.query.search ? String(req.query.search) : undefined
  const subscribers = await listSubscribers({ search })
  res.json({ subscribers })
})

export const deleteSubscriberController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await deleteSubscriber(String(req.params.id), req.user.id)
  res.json({ message: 'Subscriber removed' })
})
