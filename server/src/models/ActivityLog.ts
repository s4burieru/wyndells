export const activityLogTable = 'activity_log'

/**
 * Stable machine names written to `activity_log.action`. Grouped on the admin
 * Activity page by the prefix before the dot (reservation, feedback, career,
 * user, branch, table, menu).
 */
export const ACTIVITY_ACTIONS = [
  'reservation.created',
  'reservation.status_changed',
  'reservation.table_assigned',
  'feedback.created',
  'feedback.deleted',
  'career.application_created',
  'career.application_status_changed',
  'user.created',
  'user.updated',
  'user.profile_updated',
  'user.status_changed',
  'user.deleted',
  'branch.created',
  'branch.updated',
  'branch.status_changed',
  'branch.deleted',
  'table.created',
  'table.updated',
  'table.status_changed',
  'menu.created',
  'menu.updated',
  'menu.deleted',
] as const
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number]

/** Row shape as stored in the Supabase `activity_log` table. */
export type ActivityRow = {
  id: string
  actor_id: string | null
  branch_id: string | null
  action: string
  summary: string
  entity: string
  entity_id: string
  created_at: string
}

/** Actor reference resolved from `actor_id` (null for public/system actions). */
export type ActivityActorRow = { id: string; name: string; role: string } | null

export type ActivityWithRelationsRow = ActivityRow & {
  actor: ActivityActorRow
  branch: { id: string; name: string; code: string } | null
}

/** Public JSON shape returned to the client. */
export type ActivityEntry = {
  _id: string
  action: string
  summary: string
  entity: string
  entityId: string
  actor: { _id: string; name: string; role: string } | null
  branch: { _id: string; name: string; code: string } | null
  createdAt: string
}

export function toActivityEntry(row: ActivityWithRelationsRow): ActivityEntry {
  return {
    _id: row.id,
    action: row.action,
    summary: row.summary,
    entity: row.entity,
    entityId: row.entity_id,
    actor: row.actor ? { _id: row.actor.id, name: row.actor.name, role: row.actor.role } : null,
    branch: row.branch
      ? { _id: row.branch.id, name: row.branch.name, code: row.branch.code }
      : null,
    createdAt: row.created_at,
  }
}
