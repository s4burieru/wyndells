import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOverview } from '../../api/reports'
import type {  Overview  } from '../../lib/types'
import { formatDate, friendlyError, todayLocal } from '../../lib/format'
import { ErrorState, PageHeader, Spinner } from '../../components/ui/display'
import { Button } from '../../components/ui/button'
import { RatingStat, StatCard } from '../../components/dashboard/widgets'
import { ReservationsTrendCard } from '../../components/dashboard/trend-chart'
import { TablesDonutCard } from '../../components/dashboard/tables-chart'
import { StatusDistributionCard } from '../../components/dashboard/status-chart'
import { useAuth } from '../../lib/auth'
import { RecentFeedbackSection, UpcomingSection } from './OverviewSections'
import { BranchPerformanceCard } from '../../components/dashboard/branch-chart'

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
        subtitle={user ? `Welcome back, ${user.name}. Here is what’s happening today.` : undefined}
        action={
          <Button asChild>
            <Link to="/staff/reservations">
              Manage reservations
            </Link>
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Today · ${formatDate(todayLocal())}`} value={overview.today.reservations} accent="text-wyndell-orange-dark" />
        <StatCard label="Today confirmed" value={overview.today.confirmed} accent="text-wyndell-green-dark" />
        <StatCard label="Pending reservations" value={overview.counts.pending} accent="text-yellow-700" />
        <StatCard label="Completed reservations" value={overview.counts.completed} accent="text-wyndell-green-dark" />
      </div>

      <div className="mt-6">
        <ReservationsTrendCard trend={overview.trend} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <StatusDistributionCard counts={overview.counts} />
        <TablesDonutCard tables={overview.tables} />
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-wyndell-forest">Guest feedback</h2>
          <RatingStat label="Average rating" value={overview.feedback.averageRating} count={overview.feedback.count} />
        </section>
      </div>

      {overview.role === 'admin' ? (
        <div className="mt-6">
          <BranchPerformanceCard overview={overview as Extract<Overview, { role: 'admin' }>} />
        </div>
      ) : null}

      <UpcomingSection upcoming={overview.upcoming} />
      <RecentFeedbackSection items={overview.recentFeedback} />
    </div>
  )
}
