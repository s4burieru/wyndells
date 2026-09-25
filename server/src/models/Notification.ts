import { toBranchRef, type BranchRef, type BranchRefRow } from './Branch'

export const notificationsTable = 'notifications'

/** Values of the `notification_type` enum (see supabase/migrations/0004). */
export const NOTIFICATION_TYPES = [
  'reservation_new',
  'reservation_status',
  'table_assigned',
  'feedback_new',
  'application_new',
  'application_status',
  'staff_created',
  'welcome',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/** Row shape as stored in the Supabase `notifications` table. */
export type NotificationRow = {
  id: string
  user_id: string
  branch_id: string | null
  type: NotificationType
  title: string
  body: string
  link: string
  read_at: string | null
  created_at: string
}

export type NotificationWithBranchRow = NotificationRow & { branch: BranchRefRow | null }

/** Public JSON shape returned to the client. */
export type Notification = {
  _id: string
  type: NotificationType
  title: string
  body: string
  link: string
  isRead: boolean
  branch: BranchRef | null
  createdAt: string
}

export function toNotification(row: NotificationWithBranchRow): Notification {
  return {
    _id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    isRead: row.read_at !== null,
    branch: row.branch ? toBranchRef(row.branch) : null,
    createdAt: row.created_at,
  }
}
