import { useEffect, useState } from 'react'
import { fetchOverview } from '../../api/reports'
import type {  Overview  } from '../../lib/types'
import { friendlyError, reservationLabel } from '../../lib/format'
import { PageHeader, Spinner, ErrorState } from '../../components/ui/display'
import { HBar, TrendChart } from '../../components/dashboard/widgets'
import { useAuth } from '../../lib/auth'

export function ReportsPage() {
  const { user } = useAuth()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    void fetchOverview()
      .then(setOverview)
      .catch((reason: unknown) => setError(friendlyError(reason)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <Spinner label="Preparing reports…" />
  }
  if (error || !overview) {
    return <ErrorState message={error || 'Unable to generate reports.'} />
  }

  const maxCount = Math.max(...Object.values(overview.counts), 1)
  const isAdmin = user?.role === 'admin'

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={`Reservation trends and customer ratings for ${isAdmin ? 'all branches' : 'your branch'}.`}
      />

      <section className="mt-6">
        <h2 className="text-base font-semibold text-wyndell-forest">Reservations over time · last 14 days</h2>
        <div className="mt-3 rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
          <TrendChart points={overview.trend} height={160} />
          <p className="mt-2 text-xs text-neutral-500">
            Total bookings by day, including pending, confirmed, and completed.
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-wyndell-forest">Reservation status distribution</h2>
        <div className="mt-3 rounded-2xl border border-wyndell-cream-dark bg-white p-5 shadow-sm">
          {Object.entries(overview.counts).map(([key, value]) => (
            <div key={key}>
              <HBar label={reservationLabel(key as 'pending')} value={value} max={maxCount} color={key === 'pending' ? 'bg-wyndell-sun' : key === 'confirmed' || key === 'completed' ? 'bg-wyndell-green' : 'bg-wyndell-orange'} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-wyndell-forest">Customer ratings</h2>
        <div className="mt-3 rounded-2xl border border-wyndell-cream-dark bg-white p-5 shadow-sm">
          <p className="text-4xl font-bold text-wyndell-forest">
            {overview.feedback.averageRating}
            <span className="text-xl text-yellow-500"> ★</span>
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Average from {overview.feedback.count} feedback submission{overview.feedback.count === 1 ? '' : 's'}.
          </p>
        </div>
      </section>

      {isAdmin && overview.role === 'admin' ? (
        <section className="mt-6">
          <h2 className="text-base font-semibold text-wyndell-forest">Branch performance comparison</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-160 border-collapse text-sm">
              <thead>
                <tr className="border-b border-wyndell-cream-dark bg-wyndell-cream/60 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="px-3 py-2.5">Branch</th>
                  <th className="px-3 py-2.5">Reservations</th>
                  <th className="px-3 py-2.5">Confirmed</th>
                  <th className="px-3 py-2.5">Completed</th>
                  <th className="px-3 py-2.5">Completion</th>
                  <th className="px-3 py-2.5">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wyndell-cream-dark/60">
                {overview.branchPerformance.map((row) => (
                  <tr key={row.branch.id} className="hover:bg-wyndell-cream-dark/30">
                    <td className="px-3 py-2.5 font-medium text-wyndell-ink">{row.branch.name}</td>
                    <td className="px-3 py-2.5">{row.reservations}</td>
                    <td className="px-3 py-2.5">{row.confirmed}</td>
                    <td className="px-3 py-2.5">{row.completed}</td>
                    <td className="px-3 py-2.5">{row.completionRate}%</td>
                    <td className="px-3 py-2.5">{row.averageRating} ★ ({row.feedbackCount})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}