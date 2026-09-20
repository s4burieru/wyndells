import { useEffect, useState } from 'react'
import { StarIcon } from 'lucide-react'
import { fetchOverview } from '../../api/reports'
import type {  Overview  } from '../../lib/types'
import { friendlyError } from '../../lib/format'
import { PageHeader, Spinner, ErrorState } from '../../components/ui/display'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { ReservationsTrendCard } from '../../components/dashboard/trend-chart'
import { StatusDistributionCard } from '../../components/dashboard/status-chart'
import { BranchPerformanceCard } from '../../components/dashboard/branch-chart'
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

  const isAdmin = user?.role === 'admin'

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={`Reservation trends and customer ratings for ${isAdmin ? 'all branches' : 'your branch'}.`}
      />

      <div className="mt-6">
        <ReservationsTrendCard
          trend={overview.trend}
          title="Reservations over time · last 14 days"
          description="Total bookings by day, including pending, confirmed, and completed."
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StatusDistributionCard counts={overview.counts} />
        <Card>
          <CardHeader>
            <CardTitle>Customer ratings</CardTitle>
            <CardDescription>Average score from guest feedback submissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-2 text-4xl font-bold text-wyndell-forest">
              {overview.feedback.averageRating}
              <StarIcon className="size-7 fill-wyndell-sun text-wyndell-sun" aria-hidden />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Average from {overview.feedback.count} feedback submission{overview.feedback.count === 1 ? '' : 's'}.
            </p>
          </CardContent>
        </Card>
      </div>

      {isAdmin && overview.role === 'admin' ? (
        <div className="mt-6 grid gap-6">
          <BranchPerformanceCard overview={overview as Extract<Overview, { role: 'admin' }>} />
          <Card>
            <CardHeader>
              <CardTitle>Branch performance details</CardTitle>
              <CardDescription>Exact reservation counts, completion and rating per branch.</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Reservations</TableHead>
                    <TableHead className="text-right">Confirmed</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.branchPerformance.map((row) => (
                    <TableRow key={row.branch.id}>
                      <TableCell className="font-medium">{row.branch.name}</TableCell>
                      <TableCell className="text-right">{row.reservations}</TableCell>
                      <TableCell className="text-right">{row.confirmed}</TableCell>
                      <TableCell className="text-right">{row.completed}</TableCell>
                      <TableCell className="text-right">{row.completionRate}%</TableCell>
                      <TableCell className="text-right">{row.averageRating} ★ ({row.feedbackCount})</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
