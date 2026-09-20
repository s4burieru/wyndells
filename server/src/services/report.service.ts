import { getDb } from '../config/database'
import { reservationsTable, toReservation, type ReservationWithBranchRow } from '../models/Reservation'
import { feedbackTable, toFeedbackSummary, type FeedbackWithBranchRow } from '../models/Feedback'
import { branchesTable } from '../models/Branch'
import { usersTable } from '../models/User'
import { addDays, todayString } from '../utils/validate'
import { ApiError } from '../utils/ApiError'
import { ACTIVE_RESERVATION_STATUSES, RESERVATION_STATUSES, TABLE_STATUSES } from '../constants'
import type { AuthUser } from '../middleware/auth'

const TREND_DAYS = 14

/** Branch id for a manager's scoped dashboard, or null for the admin view. */
function scopedBranchId(actor: AuthUser): string | null {
  return actor.role === 'manager' ? actor.branch : null
}

/** Select used for reservation reads on the dashboard (embeds branch + table). */
const RESERVATION_SELECT = '*, branch:branch_id(id, name, code, address), table:table_id(id, table_number, capacity, location, status)'

type CountRow = { status: string; count: number }

function toCountRecord(rows: CountRow[], statuses: readonly string[]): Record<string, number> {
  const raw = new Map(rows.map((row) => [String(row.status), Number(row.count)]))
  return Object.fromEntries(statuses.map((status) => [status, raw.get(status) ?? 0]))
}

export async function getReservationCounts(branchId: string | null): Promise<
  Record<(typeof RESERVATION_STATUSES)[number], number>
> {
  const { data, error } = await getDb().rpc('reservation_status_counts', { p_branch: branchId })
  if (error) {
    throw new ApiError(500, 'Could not load reservation counts.')
  }
  return toCountRecord((data ?? []) as CountRow[], RESERVATION_STATUSES) as Record<
    (typeof RESERVATION_STATUSES)[number],
    number
  >
}

export async function getTableCounts(branchId: string | null): Promise<
  Record<(typeof TABLE_STATUSES)[number], number>
> {
  const { data, error } = await getDb().rpc('table_status_counts', { p_branch: branchId })
  if (error) {
    throw new ApiError(500, 'Could not load table counts.')
  }
  return toCountRecord((data ?? []) as CountRow[], TABLE_STATUSES) as Record<
    (typeof TABLE_STATUSES)[number],
    number
  >
}

export async function getFeedbackSummary(branchId: string | null) {
  const { data, error } = await getDb().rpc('feedback_summary', { p_branch: branchId })
  if (error) {
    throw new ApiError(500, 'Could not load feedback summary.')
  }
  const row = (data ?? [])[0]
  return {
    count: Number(row?.total_count ?? 0),
    averageRating: row?.average_rating != null ? Math.round(Number(row.average_rating) * 10) / 10 : 0,
  }
}

export async function getReservationTrend(
  branchId: string | null,
  days = TREND_DAYS,
) {
  type TrendRow = { date: string; total_count: number; confirmed_count: number; completed_count: number }
  const today = todayString()
  const from = addDays(today, -1 * (days - 1))
  const { data, error } = await getDb().rpc('reservation_trend', {
    p_branch: branchId,
    from_date: from,
    to_date: today,
  })
  if (error) {
    throw new ApiError(500, 'Could not load the reservation trend.')
  }
  const rows = (data ?? []) as TrendRow[]
  const byDate = new Map(rows.map((row) => [row.date, row]))
  const trend: { date: string; total: number; confirmed: number; completed: number }[] = []
  for (let offset = -1 * (days - 1); offset <= 0; offset += 1) {
    const date = addDays(today, offset)
    const row = byDate.get(date)
    trend.push({
      date,
      total: Number(row?.total_count ?? 0),
      confirmed: Number(row?.confirmed_count ?? 0),
      completed: Number(row?.completed_count ?? 0),
    })
  }
  return trend
}

export async function getUpcomingReservations(
  branchId: string | null,
  limit = 8,
) {
  let query = getDb()
    .from(reservationsTable)
    .select(RESERVATION_SELECT)
    .gte('date', todayString())
    .in('status', [...ACTIVE_RESERVATION_STATUSES])
  if (branchId) {
    query = query.eq('branch_id', branchId)
  }
  const { data, error } = await query.order('date').order('time').limit(limit)
  if (error) {
    throw new ApiError(500, 'Could not load upcoming reservations.')
  }
  return (data ?? []).map((row) => toReservation(row as ReservationWithBranchRow))
}

export async function getRecentFeedback(
  branchId: string | null,
  limit = 5,
) {
  let query = getDb().from(feedbackTable).select('customer_name, rating, comment, created_at, branch:branch_id(id, name, code)')
  if (branchId) {
    query = query.eq('branch_id', branchId)
  }
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    throw new ApiError(500, 'Could not load recent feedback.')
  }
  return (data ?? []).map((row) => toFeedbackSummary(row as unknown as FeedbackWithBranchRow))
}

/** Branch comparison used on the admin dashboard and reports. */
export async function getBranchPerformance() {
  type PerformanceRow = {
    branch_id: string
    branch_name: string
    branch_code: string
    branch_city: string
    reservations: number
    pending: number
    confirmed: number
    completed: number
    cancelled: number
    rejected: number
    no_show: number
    feedback_count: number
    average_rating: number | null
  }
  const { data, error } = await getDb().rpc('branch_performance', {})
  if (error) {
    throw new ApiError(500, 'Could not load branch performance.')
  }
  return ((data ?? []) as PerformanceRow[]).map((row) => {
    const reservations = Number(row.reservations ?? 0)
    const completed = Number(row.completed ?? 0)
    const averageRating = row.average_rating != null ? Number(row.average_rating) : 0
    return {
      branch: {
        id: String(row.branch_id),
        name: String(row.branch_name),
        code: String(row.branch_code),
        city: String(row.branch_city),
      },
      reservations,
      pending: Number(row.pending ?? 0),
      confirmed: Number(row.confirmed ?? 0),
      completed,
      cancelled: Number(row.cancelled ?? 0),
      rejected: Number(row.rejected ?? 0),
      noShow: Number(row.no_show ?? 0),
      completionRate: reservations > 0 ? Math.round((completed / reservations) * 100) : 0,
      averageRating: averageRating > 0 ? Math.round(averageRating * 10) / 10 : 0,
      feedbackCount: Number(row.feedback_count ?? 0),
    }
  })
}

async function countReservations(branchId: string | null, date?: string, status?: string): Promise<number> {
  let query = getDb().from(reservationsTable).select('id', { count: 'exact', head: true })
  if (branchId) {
    query = query.eq('branch_id', branchId)
  }
  if (date) {
    query = query.eq('date', date)
  }
  if (status) {
    query = query.eq('status', status)
  }
  const { count, error } = await query
  if (error) {
    throw new ApiError(500, 'Could not load reservation counts.')
  }
  return count ?? 0
}

export async function getOverview(actor: AuthUser) {
  const isManager = actor.role === 'manager'
  const branchId = scopedBranchId(actor)
  const today = todayString()

  const counts = await getReservationCounts(branchId)
  const tables = await getTableCounts(branchId)
  const feedback = await getFeedbackSummary(branchId)
  const trend = await getReservationTrend(branchId)
  const upcoming = await getUpcomingReservations(branchId)
  const recentFeedback = await getRecentFeedback(branchId)

  const todayReservations = await countReservations(branchId, today)
  const todayConfirmed = await countReservations(branchId, today, 'confirmed')

  const base = {
    role: actor.role,
    today: { reservations: todayReservations, confirmed: todayConfirmed },
    counts,
    tables,
    feedback,
    trend,
    upcoming,
    recentFeedback,
  }

  if (isManager) {
    const { data: branch, error } = await getDb()
      .from(branchesTable)
      .select('name, code')
      .eq('id', actor.branch!)
      .maybeSingle()
    if (error || !branch) {
      throw new ApiError(500, 'Could not load your branch.')
    }
    return {
      ...base,
      scope: {
        branchId: actor.branch,
        branchName: branch.name ?? 'My branch',
        branchCode: branch.code ?? '',
      },
    }
  }

  const { count: branchTotal } = await getDb()
    .from(branchesTable)
    .select('id', { count: 'exact', head: true })
  const { count: managerTotal } = await getDb()
    .from(usersTable)
    .select('id', { count: 'exact', head: true })
    .eq('role', 'manager')

  return {
    ...base,
    scope: { branchId: null, branchName: 'All branches' },
    branchPerformance: await getBranchPerformance(),
    totals: {
      branches: branchTotal ?? 0,
      managers: managerTotal ?? 0,
    },
  }
}