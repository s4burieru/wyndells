import { createHash } from 'node:crypto'
import { getDb } from '../config/database'
import {
  newsletterSubscribersTable,
  toNewsletterSubscriber,
  type NewsletterSource,
  type NewsletterSubscriberRow,
} from '../models/NewsletterSubscriber'
import { ApiError } from '../utils/ApiError'
import { assertEmail, assertUuid, requireFields } from '../utils/validate'
import { NEWSLETTER_MAX_SUBMISSIONS_PER_CLIENT_PER_HOUR } from '../constants'
import { recordActivity } from './activity.service'

const SUBMISSION_WINDOW_MS = 60 * 60 * 1000 // one hour
const MAX_NAME_LENGTH = 120

/**
 * In-memory per-client signup timestamps used to throttle list-bombing, the
 * same approach as feedback. Keys are a hash of the client IP + user agent, so
 * raw IPs are never kept.
 */
const submissionsByClient = new Map<string, number[]>()

function hashClientKey(clientKey: string): string {
  return createHash('sha256').update(clientKey).digest('hex').slice(0, 24)
}

function pruneClientTimestamps(): void {
  const now = Date.now()
  for (const [key, timestamps] of submissionsByClient) {
    const recent = timestamps.filter((timestamp) => now - timestamp < SUBMISSION_WINDOW_MS)
    if (recent.length === 0) {
      submissionsByClient.delete(key)
    } else {
      submissionsByClient.set(key, recent)
    }
  }
  if (submissionsByClient.size > 2000) {
    submissionsByClient.clear()
  }
}

function assertWithinRateLimit(clientKey: string): void {
  const now = Date.now()
  const key = hashClientKey(clientKey)
  const recent = (submissionsByClient.get(key) ?? []).filter(
    (timestamp) => now - timestamp < SUBMISSION_WINDOW_MS,
  )
  if (recent.length >= NEWSLETTER_MAX_SUBMISSIONS_PER_CLIENT_PER_HOUR) {
    throw new ApiError(429, 'Too many signup attempts. Please try again a little later.')
  }
  recent.push(now)
  submissionsByClient.set(key, recent)
  if (submissionsByClient.size % 50 === 0) {
    pruneClientTimestamps()
  }
}

function parseSource(value: unknown): NewsletterSource {
  return String(value ?? 'homepage').trim() === 'popup' ? 'popup' : 'homepage'
}

/**
 * Public signup from the home-page section or the timed popup. Re-subscribing
 * an address we already hold is a success, not an error — the visitor just
 * wants to be on the list, and telling them so is friendlier than a 409.
 */
export async function subscribeNewsletter(
  payload: Record<string, unknown>,
  clientKey: string,
): Promise<{ subscriber: NewsletterSubscriberRow; alreadySubscribed: boolean }> {
  requireFields(payload, ['email'])
  assertWithinRateLimit(clientKey)

  const email = String(payload.email).trim().toLowerCase()
  assertEmail(email, 'email address')

  const name = String(payload.name ?? '').trim()
  if (name.length > MAX_NAME_LENGTH) {
    throw new ApiError(400, `Please keep your name to ${MAX_NAME_LENGTH} characters or fewer.`)
  }
  const source = parseSource(payload.source)

  const { data: existing, error: existingError } = await getDb()
    .from(newsletterSubscribersTable)
    .select('*')
    .eq('email', email)
    .maybeSingle()
  if (existingError) {
    throw new ApiError(500, 'Could not save your signup. Please try again.')
  }
  if (existing) {
    return { subscriber: existing as NewsletterSubscriberRow, alreadySubscribed: true }
  }

  const { data: created, error } = await getDb()
    .from(newsletterSubscribersTable)
    .insert({ name, email, source })
    .select('*')
    .single()
  if (error) {
    // A concurrent signup for the same address lands here too — still a success.
    if (String(error.code ?? '') === '23505') {
      const { data: raced } = await getDb()
        .from(newsletterSubscribersTable)
        .select('*')
        .eq('email', email)
        .maybeSingle()
      if (raced) {
        return { subscriber: raced as NewsletterSubscriberRow, alreadySubscribed: true }
      }
    }
    throw new ApiError(500, 'Could not save your signup. Please try again.')
  }
  const subscriber = created as NewsletterSubscriberRow

  void recordActivity({
    action: 'newsletter.subscribed',
    summary: `${email} subscribed to the newsletter (${source})`,
    entity: 'newsletter_subscriber',
    entityId: subscriber.id,
  })

  return { subscriber, alreadySubscribed: false }
}

/** Staff listing for the Customers screen, newest signup first. */
export async function listSubscribers(filter: { search?: string; limit?: number } = {}) {
  let query = getDb().from(newsletterSubscribersTable).select('*')
  // PostgREST parses `or=(...)` as a list, so strip the punctuation that would
  // break the filter rather than letting a stray ")" fail the whole query.
  const search = filter.search?.trim().toLowerCase().replace(/[(),.%\\]/g, ' ').replace(/\s+/g, ' ')
  if (search) {
    // `or` keeps name and email in one pass; ilike gives a substring match.
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(filter.limit ?? 200, 1), 500))
  if (error) {
    throw new ApiError(500, 'Could not load newsletter subscribers.')
  }
  return (data ?? []).map((row) => toNewsletterSubscriber(row as NewsletterSubscriberRow))
}

export async function deleteSubscriber(id: string, actorId: string): Promise<void> {
  assertUuid(id, 'subscriber')
  const { data: existing } = await getDb()
    .from(newsletterSubscribersTable)
    .select('id, email')
    .eq('id', id)
    .maybeSingle()

  const { data, error } = await getDb()
    .from(newsletterSubscribersTable)
    .delete()
    .eq('id', id)
    .select('id')
    .single()
  if (error || !data) {
    throw new ApiError(404, 'Subscriber not found')
  }

  if (existing) {
    void recordActivity({
      actorId,
      action: 'newsletter.deleted',
      summary: `${existing.email} was removed from the newsletter list`,
      entity: 'newsletter_subscriber',
      entityId: id,
    })
  }
}
