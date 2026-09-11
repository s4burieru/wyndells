import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOverview } from '../../api/reports'
import type {  Overview  } from '../../lib/types'
import { formatDate, friendlyError, reservationLabel, todayLocal } from '../../lib/format'
import { ErrorState, PageHeader, Spinner } from '../../components/ui/display'
import { RatingStat, StatCard, TrendChart } from '../../components/dashboard/widgets'
import { useAuth } from '../../lib/auth'
import { AdminSections, RecentFeedbackSection, UpcomingSection } from './OverviewSections'

export function DashboardOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    setLoading(true)
    setError('')
    void fetchOverview()
      .then(setOverview)
      .catch((reason: unknown) => setError(friendlyError(reason)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <Spinner label="Loading your dashboard…" />
  }
  if (error || !overview) {
    return <ErrorState message={error || 'Unable to load the dashboard.'} />
  }

  return (
    <div>
      <PageHeader
        title={overview.scope.branchId ? `${overview.scope.branchName} · Dashboard` : 'Central Dashboard'}
        subtitle={user ? `Welcome back, ${user.name}. Here is what&rsquo;s happening today.` : undefined}
        action={
          <Link to="/staff/reservations" className="rounded-lg bg-wyndell-orange px-4 py-2 text-sm font-semibold text-white hover:bg-wyndell-orange-dark">
            Manage reservations
          </Link>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Today · ${formatDate(todayLocal())}`} value={overview.today.reservations} accent="text-wyndell-orange-dark" />
        <StatCard label="Today confirmed" value={overview.today.confirmed} accent="text-wyndell-green-dark" />
        <StatCard label="Pending reservations" value={overview.counts.pending} accent="text-yellow-700" />
        <StatCard label="Completed reservations" value={overview.counts.completed} accent="text-wyndell-green-dark" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section>
          <h2 className="text-base font-semibold text-wyndell-forest">Reservation status</h2>
          <div className="mt-3 rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
            <dl className="space-y-2.5 text-sm">
              {Object.entries(overview.counts).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <dt className="text-neutral-500">{reservationLabel(key as 'pending')}</dt>
                  <dd className="font-semibold text-wyndell-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-wyndell-forest">Tables right now</h2>
          <div className="mt-3 rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
            <dl className="space-y-2.5 text-sm">
              <TableCountRow label="Available" value={overview.tables.available} className="font-semibold text-wyndell-green-dark" />
              <TableCountRow label="Reserved" value={overview.tables.reserved} className="font-semibold text-wyndell-orange-dark" />
              <TableCountRow label="Occupied" value={overview.tables.occupied} className="font-semibold text-wyndell-orange-dark" />
              <TableCountRow label="Cleaning" value={overview.tables.cleaning} />
              <TableCountRow label="Unavailable" value={overview.tables.unavailable} className="text-neutral-500" />
            </dl>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-wyndell-forest">Guest feedback</h2>
          <RatingStat label="Average rating" value={overview.feedback.averageRating} count={overview.feedback.count} />
        </section>
      </div>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-wyndell-forest">Reservations · last 14 days</h2>
        <div className="mt-3 rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
          <TrendChart points={overview.trend} />
        </div>
      </section>

      {overview.role === 'admin' ? <AdminSections overview={overview as Extract<Overview, { role: 'admin' }>} /> : null}

      <UpcomingSection upcoming={overview.upcoming} />
      <RecentFeedbackSection items={overview.recentFeedback} />
    </div>
  )
}

function TableCountRow({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={className ?? 'font-semibold text-wyndell-ink'}>{value}</dd>
    </div>
  )
}