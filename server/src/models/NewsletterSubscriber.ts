export const newsletterSubscribersTable = 'newsletter_subscribers'

/** Where a signup came from — the home-page section or the timed popup. */
export type NewsletterSource = 'homepage' | 'popup'

/** Row shape as stored in the Supabase `newsletter_subscribers` table. */
export type NewsletterSubscriberRow = {
  id: string
  name: string
  email: string
  source: NewsletterSource
  created_at: string
  updated_at: string
}

/** Staff JSON shape returned to the dashboard's Customers screen. */
export type NewsletterSubscriber = {
  _id: string
  name: string
  email: string
  source: NewsletterSource
  createdAt: string
}

export function toNewsletterSubscriber(row: NewsletterSubscriberRow): NewsletterSubscriber {
  return {
    _id: row.id,
    name: row.name,
    email: row.email,
    source: row.source,
    createdAt: row.created_at,
  }
}
