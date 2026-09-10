import mongoose from 'mongoose'
import { ReservationModel } from '../models/Reservation'
import { DiningTableModel } from '../models/DiningTable'
import { FeedbackModel } from '../models/Feedback'
import { BranchModel } from '../models/Branch'
import { UserModel } from '../models/User'
import { addDays, todayString } from '../utils/validate'
import { ACTIVE_RESERVATION_STATUSES, RESERVATION_STATUSES, TABLE_STATUSES } from '../constants'
import type { AuthUser } from '../middleware/auth'

const ObjectId = mongoose.Types.ObjectId
const TREND_DAYS = 14

function objectId(value: string): mongoose.Types.ObjectId {
  return new ObjectId(value)
}

type CountRow = { _id: string; count: number }

async function countByField(
  collection: 'reservations' | 'tables',
  branchFilter: Record<string, unknown>,
): Promise<Record<string, number>> {
  const model = collection === 'reservations' ? ReservationModel : DiningTableModel
  const rows = (await model.aggregate([
    { $match: branchFilter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])) as unknown as CountRow[]

  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row._id as string] = row.count
  }
  return counts
}

export async function getReservationCounts(branchFilter: Record<string, unknown>): Promise<
  Record<(typeof RESERVATION_STATUSES)[number], number>
> {
  const raw = await countByField('reservations', branchFilter)
  const counts = Object.fromEntries(RESERVATION_STATUSES.map((status) => [status, 0])) as Record<
    (typeof RESERVATION_STATUSES)[number],
    number
  >
  for (const status of RESERVATION_STATUSES) {
    counts[status] = raw[status] ?? 0
  }
  return counts
}

export async function getTableCounts(branchFilter: Record<string, unknown>): Promise<
  Record<(typeof TABLE_STATUSES)[number], number>
> {
  const raw = await countByField('tables', branchFilter)
  const counts = Object.fromEntries(TABLE_STATUSES.map((status) => [status, 0])) as Record<
    (typeof TABLE_STATUSES)[number],
    number
  >
  for (const status of TABLE_STATUSES) {
    counts[status] = raw[status] ?? 0
  }
  return counts
}

export async function getFeedbackSummary(branchFilter: Record<string, unknown>) {
  const rows = (await FeedbackModel.aggregate([
    { $match: branchFilter },
    { $group: { _id: null as null, count: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
  ])) as unknown as Array<{ _id: null; count: number; averageRating: number }>

  const row = rows[0]
  return {
    count: row?.count ?? 0,
    averageRating: row ? Math.round(row.averageRating * 10) / 10 : 0,
  }
}

export async function getReservationTrend(
  branchFilter: Record<string, unknown>,
  days = TREND_DAYS,
) {
  const today = todayString()
  const from = addDays(today, -1 * (days - 1))
  const rows = (await ReservationModel.aggregate([
    { $match: { ...branchFilter, date: { $gte: from, $lte: today } } },
    {
      $group: {
        _id: '$date',
        total: { $sum: 1 },
        confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ])) as unknown as Array<{ _id: string; total: number; confirmed: number; completed: number }>

  const byDate = new Map(rows.map((row) => [row._id, row]))
  const trend: { date: string; total: number; confirmed: number; completed: number }[] = []
  for (let offset = -1 * (days - 1); offset <= 0; offset += 1) {
    const date = addDays(today, offset)
    const row = byDate.get(date)
    trend.push({
      date,
      total: row?.total ?? 0,
      confirmed: row?.confirmed ?? 0,
      completed: row?.completed ?? 0,
    })
  }
  return trend
}

export async function getUpcomingReservations(
  branchFilter: Record<string, unknown>,
  limit = 8,
) {
  return ReservationModel.find({
    ...branchFilter,
    date: { $gte: todayString() },
    status: { $in: [...ACTIVE_RESERVATION_STATUSES] },
  })
    .sort({ date: 1, time: 1 })
    .limit(limit)
    .populate('branch', 'name')
    .populate('table', 'tableNumber')
    .lean()
}

export async function getRecentFeedback(
  branchFilter: Record<string, unknown>,
  limit = 5,
) {
  return FeedbackModel.find(branchFilter)
    .select('customerName rating comment branch createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('branch', 'name')
    .lean()
}

/** Branch comparison used on the admin dashboard and reports. */
export async function getBranchPerformance() {
  const reservationRows = (await ReservationModel.aggregate([
    {
      $group: {
        _id: '$branch',
        reservations: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } },
      },
    },
    { $sort: { reservations: -1 } },
  ])) as unknown as Array<{
    _id: string
    reservations: number
    pending: number
    confirmed: number
    completed: number
    cancelled: number
    rejected: number
    noShow: number
  }>

  const ratingRows = (await FeedbackModel.aggregate([
    { $group: { _id: '$branch', feedbackCount: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
  ])) as unknown as Array<{ _id: string; feedbackCount: number; averageRating: number }>

  const ratingByBranch = new Map(ratingRows.map((row) => [String(row._id), row]))
  const branches = await BranchModel.find().select('name code city').lean()

  const byBranch = new Map(reservationRows.map((row) => [String(row._id), row]))
  return branches.map((branch) => {
    const row = byBranch.get(String(branch._id))
    const ratings = ratingByBranch.get(String(branch._id))
    const reservations = row?.reservations ?? 0
    const confirmed = row?.confirmed ?? 0
    const completed = row?.completed ?? 0
    return {
      branch: { id: String(branch._id), name: branch.name, code: branch.code, city: branch.city },
      reservations,
      pending: row?.pending ?? 0,
      confirmed,
      completed,
      cancelled: row?.cancelled ?? 0,
      rejected: row?.rejected ?? 0,
      noShow: row?.noShow ?? 0,
      completionRate: reservations > 0 ? Math.round((completed / reservations) * 100) : 0,
      averageRating: ratings ? Math.round(ratings.averageRating * 10) / 10 : 0,
      feedbackCount: ratings?.feedbackCount ?? 0,
    }
  })
}

export async function getOverview(actor: AuthUser) {
  const isManager = actor.role === 'manager'
  const branchFilter: Record<string, unknown> = isManager
    ? { branch: objectId(actor.branch!) }
    : {}
  const today = todayString()

  const counts = await getReservationCounts(branchFilter)
  const tables = await getTableCounts(branchFilter)
  const feedback = await getFeedbackSummary(branchFilter)
  const trend = await getReservationTrend(branchFilter)
  const upcoming = await getUpcomingReservations(branchFilter)
  const recentFeedback = await getRecentFeedback(branchFilter)

  const todayReservations = await ReservationModel.countDocuments({ ...branchFilter, date: today })
  const todayConfirmed = await ReservationModel.countDocuments({
    ...branchFilter,
    date: today,
    status: 'confirmed',
  })

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
    const branch = await BranchModel.findById(actor.branch).select('name code').lean()
    return {
      ...base,
      scope: {
        branchId: actor.branch,
        branchName: branch?.name ?? 'My branch',
        branchCode: branch?.code ?? '',
      },
    }
  }

  return {
    ...base,
    scope: { branchId: null, branchName: 'All branches' },
    branchPerformance: await getBranchPerformance(),
    totals: {
      branches: await BranchModel.countDocuments(),
      managers: await UserModel.countDocuments({ role: 'manager' }),
    },
  }
}