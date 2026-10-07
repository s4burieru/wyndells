import { apiQuery, apiRequest } from '@/services/api/client'
import type { NewsletterSource, NewsletterSubscriber } from '@/types'

/**
 * Public signup from the home-page section or the timed popup. Re-subscribing
 * an address we already hold resolves with `alreadySubscribed: true` rather
 * than an error, so the UI can show the same friendly confirmation either way.
 */
export async function subscribeNewsletter(payload: {
  name?: string
  email: string
  source?: NewsletterSource
}): Promise<{ email: string; alreadySubscribed: boolean }> {
  const data = await apiRequest<{
    subscriber: { email: string }
    alreadySubscribed: boolean
  }>('/api/newsletter', { method: 'POST', body: payload, auth: false })
  return { email: data.subscriber.email, alreadySubscribed: data.alreadySubscribed }
}

/** Staff listing for the Customers screen. */
export async function fetchSubscribers(search?: string): Promise<NewsletterSubscriber[]> {
  const data = await apiRequest<{ subscribers: NewsletterSubscriber[] }>(
    apiQuery('/api/newsletter/manage', { search }),
  )
  return data.subscribers
}

export async function deleteSubscriber(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`/api/newsletter/${id}`, { method: 'DELETE' })
}
