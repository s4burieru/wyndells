import { getDb } from '../config/database'
import { type BranchRefRow } from '../models/Branch'
import {
  promotionsTable,
  toPromotion,
  PROMOTION_KINDS,
  type PromotionKind,
  type PromotionRow,
  type PromotionWithBranchRow,
} from '../models/Promotion'
import { ApiError } from '../utils/ApiError'
import { pickFields } from '../utils/pick'
import { assertDateString, assertUuid, requireFields, todayString } from '../utils/validate'
import { assertBranchAccess, type AuthUser } from '../middleware/auth'
import { recordActivity } from './activity.service'
import {
  deleteStoredPromotionImage,
  uploadPromotionImage,
  type PromotionImageUpload,
} from './promotionImage.service'

const MAX_TITLE_LENGTH = 160
const MAX_SUMMARY_LENGTH = 500

/**
 * Fields a staff form may change. `image` is handled separately because it can
 * arrive either as an uploaded file or as an already-stored URL.
 */
const PROMOTION_EDITABLE_FIELDS = [
  'branch',
  'kind',
  'title',
  'summary',
  'image',
  'eventDate',
  'startsOn',
  'expiresOn',
  'isPublished',
]

/** Select used for reads that embed the branch reference (may be null = restaurant-wide). */
const PROMOTION_SELECT = '*, branch:branch_id(id, name, code)'

/** Same as above, but the embed also carries `is_active` for the public window check. */
type PublicPromotionRow = Omit<PromotionWithBranchRow, 'branch'> & {
  branch: (BranchRefRow & { is_active: boolean }) | null
}

function normalizeOptionalDate(value: unknown, label: string): string | null {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null
  }
  return assertDateString(String(value).trim(), label)
}

function parseKind(value: unknown): PromotionKind {
  const kind = String(value ?? '').trim() as PromotionKind
  if (!PROMOTION_KINDS.includes(kind)) {
    throw new ApiError(400, 'Please choose a promotion type.')
  }
  return kind
}

/** Multipart forms send booleans as `'true'` / `'false'` strings. */
function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback
  }
  if (typeof value === 'boolean') {
    return value
  }
  return String(value).toLowerCase() === 'true'
}

function assertWindow(startsOn: string | null, expiresOn: string | null): void {
  if (startsOn && expiresOn && startsOn > expiresOn) {
    throw new ApiError(400, 'The "until" date cannot be earlier than the "from" date.')
  }
}

/**
 * Public listing — published rows inside their visibility window, newest event
 * date first, dropping rows pinned to a deactivated branch.
 *
 * The window and branch checks run on the fetched rows rather than in SQL: the
 * visibility window is two nullable date columns (an OR per end), and a
 * restaurant-wide row has no branch to join, so a single query would need a
 * nested `or` PostgREST cannot express. The query is already capped well above
 * anything the home page renders.
 */
export async function listPublicPromotions(limit = 6) {
  const today = todayString()
  const { data, error } = await getDb()
    .from(promotionsTable)
    // `is_active` rides along on the embed purely so rows pinned to a
    // deactivated branch can be dropped; `toBranchRef` still exposes only
    // id / name / code to the client.
    .select('*, branch:branch_id(id, name, code, is_active)')
    .eq('is_published', true)
    .order('event_date', { ascending: false })
    .limit(100)
  if (error) {
    throw new ApiError(500, 'Could not load promotions.')
  }
  const rows = (data ?? []) as unknown as PublicPromotionRow[]
  return rows
    .filter((row) => {
      // Restaurant-wide rows (no branch) always qualify; branch rows only while
      // that branch is still active.
      if (row.branch && !row.branch.is_active) return false
      if (row.starts_on && row.starts_on > today) return false
      if (row.expires_on && row.expires_on < today) return false
      return true
    })
    .map((row) => toPromotion(row))
    .slice(0, Math.min(Math.max(limit, 1), 20))
}

/**
 * Staff listing — drafts included. Managers only ever see their own branch;
 * administrators can narrow to one branch or to the restaurant-wide rows
 * (`branchFilter === 'all'` resets the filter, `'wide'` means `branch_id is null`).
 */
export async function listManageablePromotions(actor: AuthUser, branchFilter?: string) {
  let query = getDb().from(promotionsTable).select(PROMOTION_SELECT)
  if (actor.role === 'manager') {
    query = query.eq('branch_id', assertUuid(actor.branch ?? '', 'branch'))
  } else if (branchFilter === 'wide') {
    query = query.is('branch_id', null)
  } else if (branchFilter && branchFilter !== 'all') {
    query = query.eq('branch_id', assertUuid(branchFilter, 'branch'))
  }
  const { data, error } = await query.order('event_date', { ascending: false }).limit(200)
  if (error) {
    throw new ApiError(500, 'Could not load promotions.')
  }
  return (data ?? []).map((row) => toPromotion(row as unknown as PromotionWithBranchRow))
}

/**
 * Resolves which branch a promotion belongs to. Managers are always pinned to
 * their own branch and may never publish restaurant-wide rows.
 */
function resolveBranchId(actor: AuthUser, requested: unknown): string | null {
  if (actor.role === 'manager') {
    const branchId = actor.branch ?? ''
    assertBranchAccess(actor, branchId)
    return branchId
  }
  if (requested === undefined || requested === null || String(requested).trim() === '') {
    return null
  }
  return assertUuid(String(requested).trim(), 'branch')
}

async function assertPromotionWriteAccess(id: string, actor: AuthUser): Promise<PromotionRow> {
  const { data, error } = await getDb()
    .from(promotionsTable)
    .select('*')
    .eq('id', assertUuid(id, 'promotion'))
    .maybeSingle()
  if (error || !data) {
    throw new ApiError(404, 'Promotion not found')
  }
  const row = data as PromotionRow
  if (actor.role === 'manager') {
    if (!row.branch_id) {
      throw new ApiError(403, 'Restaurant-wide promotions can only be managed by an administrator.')
    }
    assertBranchAccess(actor, row.branch_id)
  }
  return row
}

export async function createPromotion(
  payload: Record<string, unknown>,
  file: PromotionImageUpload | undefined,
  actor: AuthUser,
) {
  requireFields(payload, ['title', 'eventDate'])
  const title = String(payload.title).trim()
  if (!title) {
    throw new ApiError(400, 'Please give the promotion a title.')
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new ApiError(400, `Please keep the title to ${MAX_TITLE_LENGTH} characters or fewer.`)
  }
  const summary = String(payload.summary ?? '').trim()
  if (summary.length > MAX_SUMMARY_LENGTH) {
    throw new ApiError(400, `Please keep the description to ${MAX_SUMMARY_LENGTH} characters or fewer.`)
  }
  const kind = parseKind(payload.kind ?? 'promotion')
  const eventDate = assertDateString(String(payload.eventDate).trim(), 'event date')
  const startsOn = normalizeOptionalDate(payload.startsOn, 'start date')
  const expiresOn = normalizeOptionalDate(payload.expiresOn, 'expiry date')
  assertWindow(startsOn, expiresOn)
  const branchId = resolveBranchId(actor, payload.branch)

  const { data: created, error } = await getDb()
    .from(promotionsTable)
    .insert({
      branch_id: branchId,
      kind,
      title,
      summary,
      // The photo travels with the row so a failed upload never leaves a
      // half-created promotion behind (multer has already buffered the file).
      image: '',
      event_date: eventDate,
      starts_on: startsOn,
      expires_on: expiresOn,
      is_published: parseBoolean(payload.isPublished, false),
    })
    .select('id')
    .single()
  if (error) {
    throw new ApiError(500, 'Could not create the promotion.')
  }
  const id = String(created.id)

  if (file) {
    try {
      const imageUrl = await uploadPromotionImage(id, file)
      const { error: imageError } = await getDb()
        .from(promotionsTable)
        .update({ image: imageUrl })
        .eq('id', id)
      if (imageError) {
        throw imageError
      }
    } catch (reason) {
      // Roll the row back so a storage failure never leaves an invisible card.
      await getDb().from(promotionsTable).delete().eq('id', id)
      if (reason instanceof ApiError) {
        throw reason
      }
      throw new ApiError(500, 'Could not save the promotion image. Please try again.')
    }
  }

  void recordActivity({
    actorId: actor.id,
    branchId,
    action: 'promotion.created',
    summary: `${title} was added as a ${kind}`,
    entity: 'promotion',
    entityId: id,
  })

  return getPromotionById(id)
}

export async function updatePromotion(
  id: string,
  payload: Record<string, unknown>,
  file: PromotionImageUpload | undefined,
  actor: AuthUser,
) {
  const existing = await assertPromotionWriteAccess(id, actor)
  const updates = pickFields(payload, PROMOTION_EDITABLE_FIELDS)

  const row: Record<string, unknown> = {}
  if (updates.title !== undefined) {
    const title = String(updates.title).trim()
    if (!title) {
      throw new ApiError(400, 'Please give the promotion a title.')
    }
    if (title.length > MAX_TITLE_LENGTH) {
      throw new ApiError(400, `Please keep the title to ${MAX_TITLE_LENGTH} characters or fewer.`)
    }
    row.title = title
  }
  if (updates.summary !== undefined) {
    const summary = String(updates.summary).trim()
    if (summary.length > MAX_SUMMARY_LENGTH) {
      throw new ApiError(400, `Please keep the description to ${MAX_SUMMARY_LENGTH} characters or fewer.`)
    }
    row.summary = summary
  }
  if (updates.kind !== undefined) row.kind = parseKind(updates.kind)
  if (updates.eventDate !== undefined) {
    row.event_date = assertDateString(String(updates.eventDate).trim(), 'event date')
  }

  const startsOn =
    updates.startsOn === undefined
      ? existing.starts_on
      : normalizeOptionalDate(updates.startsOn, 'start date')
  const expiresOn =
    updates.expiresOn === undefined
      ? existing.expires_on
      : normalizeOptionalDate(updates.expiresOn, 'expiry date')
  assertWindow(startsOn, expiresOn)
  if (updates.startsOn !== undefined) row.starts_on = startsOn
  if (updates.expiresOn !== undefined) row.expires_on = expiresOn

  if (updates.isPublished !== undefined) {
    row.is_published = parseBoolean(updates.isPublished, existing.is_published)
  }
  if (updates.branch !== undefined) {
    // Managers are pinned by `assertPromotionWriteAccess`; only admins move a
    // promotion between branches (or make it restaurant-wide).
    row.branch_id = resolveBranchId(actor, updates.branch)
  }

  // Photo handling: an uploaded file wins, an explicit empty value clears the
  // stored photo, and anything else leaves it untouched.
  let purge: string | null = null
  if (file) {
    row.image = await uploadPromotionImage(existing.id, file)
    purge = existing.image
  } else if (updates.image !== undefined && String(updates.image).trim() === '') {
    row.image = ''
    purge = existing.image
  }

  const { data: updated, error } = await getDb()
    .from(promotionsTable)
    .update(row)
    .eq('id', existing.id)
    .select('*')
    .single()
  if (error || !updated) {
    throw new ApiError(404, 'Promotion not found')
  }
  if (purge && purge !== row.image) {
    void deleteStoredPromotionImage(purge)
  }

  const changed = Object.keys(row)
  if (changed.length > 0) {
    void recordActivity({
      actorId: actor.id,
      branchId: (updated as PromotionRow).branch_id,
      action: 'promotion.updated',
      summary: `${(updated as PromotionRow).title} was updated (${changed.join(', ')})`,
      entity: 'promotion',
      entityId: existing.id,
    })
  }
  return getPromotionById(existing.id)
}

export async function deletePromotion(id: string, actor: AuthUser): Promise<void> {
  const existing = await assertPromotionWriteAccess(id, actor)
  const { data, error } = await getDb()
    .from(promotionsTable)
    .delete()
    .eq('id', existing.id)
    .select('id, title')
    .single()
  if (error || !data) {
    throw new ApiError(404, 'Promotion not found')
  }
  if (existing.image) {
    void deleteStoredPromotionImage(existing.image)
  }
  void recordActivity({
    actorId: actor.id,
    branchId: existing.branch_id,
    action: 'promotion.deleted',
    summary: `${existing.title} was removed from the promotions list`,
    entity: 'promotion',
    entityId: existing.id,
  })
}

async function getPromotionById(id: string) {
  const { data, error } = await getDb()
    .from(promotionsTable)
    .select(PROMOTION_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) {
    throw new ApiError(404, 'Promotion not found')
  }
  return toPromotion(data as PromotionWithBranchRow)
}
