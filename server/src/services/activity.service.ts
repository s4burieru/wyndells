import { getDb } from '../config/database'
import {
  activityLogTable,
  toActivityEntry,
  type ActivityEntry,
  type ActivityActorRow,
  type ActivityWithRelationsRow,
} from '../models/ActivityLog'
import { ApiError } from '../utils/ApiError'

/** How many rows a single page of the admin Activity table returns. */
const PAGE_SIZE = 50

/**
 * Upper bound so a runaway loop can never flood the audit trail with an
 * unbounded number of rows.
 */
const MAX_SUMMARY_LENGTH = 240

const ACTIVITY_SELECT =
  '*, actor:actor_id(id, name, role), branch:branch_id(id, name, code)'

export type ActivityInput = {
  /** Signed-in staff member, or null/undefined for public visitors. */
  actorId?: string | null
  branchId?: string | null
  /** Stable machine name, e.g. `reservation.status_changed`. */
  action: string
  /** Human-readable one-liner shown in the admin Activity table. */
  summary: string
  entity?: string
  entityId?: string
}

/**
 * Appends one row to the audit trail. Deliberately never throws and never
 * rejects: losing a log line must not roll back the business operation that
 * produced it. Callers therefore use `void recordActivity(...)`.
 */
export async function recordActivity(input: ActivityInput): Promise<void> {
  try {
    const summary = input.summary.trim().slice(0, MAX_SUMMARY_LENGTH)
    if (!summary) return
    const { error } = await getDb().from(activityLogTable).insert({
      actor_id: input.actorId ?? null,
      branch_id: input.branchId ?? null,
      action: input.action,
      summary,
      entity: input.entity ?? '',
      entity_id: input.entityId ?? '',
    })
    if (error) {
      console.warn(`Activity insert failed (${input.action}): ${error.message}`)
    }
  } catch (error) {
    console.warn(`Activity insert failed (${input.action}):`, error)
  }
}

export type ActivityFilter = {
  /** `action` prefix, e.g. `reservation` — used by the page's filter tabs. */
  group?: string
  actorId?: string
  branch?: string
  page?: number
}

/** Admin-only listing with prefix, actor and branch filters plus paging. */
export async function listActivity(
  filter: ActivityFilter,
): Promise<{ activities: ActivityEntry[]; total: number }> {
  const db = getDb()
  const page = Math.max(filter.page ?? 1, 1)

  let query = db.from(activityLogTable).select(ACTIVITY_SELECT, { count: 'exact' })
  if (filter.group) {
    // `like` on the prefix avoids needing a check constraint on `action`.
    query = query.like('action', `${filter.group}.%`)
  }
  if (filter.actorId) {
    query = query.eq('actor_id', filter.actorId)
  }
  if (filter.branch) {
    query = query.eq('branch_id', filter.branch)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (error) {
    throw new ApiError(500, 'Could not load the activity log.')
  }

  const activities = (data ?? []).map((row) => {
    const typed = row as ActivityWithRelationsRow & { actor: ActivityActorRow }
    return toActivityEntry(typed)
  })
  return { activities, total: count ?? activities.length }
}
