import { toBranchRef, type BranchRef, type BranchRefRow } from './Branch'

export const promotionsTable = 'promotions'

/** The kinds of card the home page can render. Keep in sync with `promotion_kind`. */
export const PROMOTION_KINDS = ['promotion', 'event', 'announcement'] as const
export type PromotionKind = (typeof PROMOTION_KINDS)[number]

/** Row shape as stored in the Supabase `promotions` table. */
export type PromotionRow = {
  id: string
  /** null = restaurant-wide. */
  branch_id: string | null
  kind: PromotionKind
  title: string
  summary: string
  image: string
  event_date: string
  starts_on: string | null
  expires_on: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export type PromotionWithBranchRow = PromotionRow & { branch: BranchRefRow | null }

/** Public + staff JSON shape returned to the client. */
export type Promotion = {
  _id: string
  /** null = restaurant-wide. */
  branch: BranchRef | null
  kind: PromotionKind
  title: string
  summary: string
  image: string
  /** YYYY-MM-DD shown on the card. */
  eventDate: string
  /** YYYY-MM-DD visibility window; either end may be open. */
  startsOn: string | null
  expiresOn: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export function toPromotion(row: PromotionWithBranchRow): Promotion {
  return {
    _id: row.id,
    branch: row.branch ? toBranchRef(row.branch) : null,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    image: row.image,
    eventDate: row.event_date,
    startsOn: row.starts_on,
    expiresOn: row.expires_on,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
