import { getDb } from '../config/database'
import {
  notificationsTable,
  toNotification,
  type Notification,
  type NotificationType,
  type NotificationWithBranchRow,
} from '../models/Notification'
import { usersTable } from '../models/User'
import { ApiError } from '../utils/ApiError'

/** How many notifications a single staff member keeps before old ones fall off. */
const RETENTION_LIMIT = 200

const NOTIFICATION_SELECT = '*, branch:branch_id(id, name, code)'

export type NotifyPayload = {
  type: NotificationType
  title: string
  body?: string
  /** Dashboard route opened when the recipient clicks the notification. */
  link?: string
  /** Branch the event belongs to (null for account-level notices). */
  branchId?: string | null
}

/**
 * Resolves who should hear about an event. Branch events reach every active
 * manager assigned to that branch plus every active administrator (admins are
 * branch-agnostic, so they are added explicitly).
 */
async function resolveRecipients(options: {
  branchId?: string | null
  adminsOnly?: boolean
}): Promise<string[]> {
  const db = getDb()
  const ids = new Set<string>()

  if (options.branchId) {
    const { data: staff, error } = await db
      .from(usersTable)
      .select('id')
      .eq('is_active', true)
      .eq('assigned_branch_id', options.branchId)
    if (!error) for (const row of staff ?? []) ids.add(String(row.id))
  }

  if (options.adminsOnly || options.branchId) {
    const { data: admins, error } = await db
      .from(usersTable)
      .select('id')
      .eq('is_active', true)
      .eq('role', 'admin')
    if (!error) for (const row of admins ?? []) ids.add(String(row.id))
  }

  return [...ids]
}

/** Writes one row per recipient. Never throws — notifications are best-effort. */
async function insertFor(recipientIds: string[], payload: NotifyPayload): Promise<void> {
  if (recipientIds.length === 0) return
  const { error } = await getDb().from(notificationsTable).insert(
    recipientIds.map((userId) => ({
      user_id: userId,
      branch_id: payload.branchId ?? null,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? '',
      link: payload.link ?? '',
    })),
  )
  if (error) {
    console.warn(`Notification insert failed (${payload.type}): ${error.message}`)
    return
  }
  await trimOldest(recipientIds)
}

/** Keeps each recipient's list at a sane size instead of growing forever. */
async function trimOldest(recipientIds: string[]): Promise<void> {
  for (const userId of recipientIds) {
    const { data, error } = await getDb()
      .from(notificationsTable)
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(RETENTION_LIMIT, RETENTION_LIMIT + 49)
    if (error || !data?.length) continue
    await getDb()
      .from(notificationsTable)
      .delete()
      .in(
        'id',
        data.map((row) => String(row.id)),
      )
  }
}

/** Fans a notification out to a branch (staff + admins). Never throws. */
export async function notifyBranch(
  branchId: string | null | undefined,
  payload: NotifyPayload,
  excludeActorId?: string | null,
): Promise<void> {
  try {
    if (!branchId) return
    let recipients = await resolveRecipients({ branchId })
    if (excludeActorId) {
      recipients = recipients.filter((id) => id !== excludeActorId)
    }
    await insertFor(recipients, { ...payload, branchId })
  } catch (error) {
    console.warn(`notifyBranch failed (${payload.type}):`, error)
  }
}

/** Fans a notification out to administrators only. Never throws. */
export async function notifyAdmins(payload: NotifyPayload): Promise<void> {
  try {
    await insertFor(await resolveRecipients({ adminsOnly: true }), { ...payload, branchId: null })
  } catch (error) {
    console.warn(`notifyAdmins failed (${payload.type}):`, error)
  }
}

/** Latest notifications for one staff member, newest first. */export async function listNotifications(
  userId: string,
  limit = 30,
): Promise<{ notifications: Notification[]; total: number; unread: number }> {
  const db = getDb()
  const capped = Math.min(Math.max(limit, 1), 100)

  const [{ data, error }, { count: total }, { count: unread }] = await Promise.all([
    db
      .from(notificationsTable)
      .select(NOTIFICATION_SELECT, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(capped),
    db
      .from(notificationsTable)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    db
      .from(notificationsTable)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null),
  ])

  if (error) {
    throw new ApiError(500, 'Could not load notifications.')
  }
  return {
    notifications: (data ?? []).map((row) => toNotification(row as NotificationWithBranchRow)),
    total: total ?? 0,
    unread: unread ?? 0,
  }
}

/** Unread badge count, returned by the fast path polled every 30 seconds. */
export async function unreadCount(userId: string): Promise<number> {
  const { count, error } = await getDb()
    .from(notificationsTable)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) {
    throw new ApiError(500, 'Could not load notifications.')
  }
  return count ?? 0
}

/** Marks one notification read (or unread) for its owner only. */
export async function setRead(
  id: string,
  userId: string,
  isRead: boolean,
): Promise<Notification> {
  const { data, error } = await getDb()
    .from(notificationsTable)
    .update({ read_at: isRead ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('user_id', userId)
    .select(NOTIFICATION_SELECT)
    .maybeSingle()
  if (error || !data) {
    throw new ApiError(404, 'Notification not found')
  }
  return toNotification(data as NotificationWithBranchRow)
}

/** Clears the badge in one call. Returns how many rows were updated. */
export async function markAllRead(userId: string): Promise<number> {
  const { data, error } = await getDb()
    .from(notificationsTable)
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
    .select('id')
  if (error) {
    throw new ApiError(500, 'Could not update notifications.')
  }
  return data?.length ?? 0
}

/**
 * Gives an account its first notification if it has none. This is what
 * guarantees every user — including ones created before this feature existed —
 * has at least one item to interact with. Safe to call on every request.
 */
export async function ensureWelcome(userId: string): Promise<void> {
  try {
    const { count, error } = await getDb()
      .from(notificationsTable)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (error || (count ?? 0) > 0) return

    const { data: user } = await getDb()
      .from(usersTable)
      .select('id, name, assigned_branch_id')
      .eq('id', userId)
      .maybeSingle()
    if (!user) return

    await insertFor([userId], {
      type: 'welcome',
      title: 'Welcome to the staff portal',
      body: 'Your account is ready. Notifications about reservations, feedback and applications will appear here.',
      link: '/staff',
      branchId: user.assigned_branch_id ?? null,
    })
  } catch (error) {
    console.warn('ensureWelcome failed:', error)
  }
}

/** Called after an account is created so it starts life with an item. */
export async function welcomeNewUser(userId: string, branchId: string | null): Promise<void> {
  try {
    await insertFor([userId], {
      type: 'welcome',
      title: 'Welcome to the staff portal',
      body: 'Your account has been created. Sign in to start managing reservations, feedback and applications.',
      link: '/staff',
      branchId,
    })
  } catch (error) {
    console.warn('welcomeNewUser failed:', error)
  }
}
