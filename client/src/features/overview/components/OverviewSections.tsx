import { Link } from 'react-router-dom'
import type {  FeedbackSummary, Overview, Reservation  } from '@/types'
import { formatDate, formatTime12 } from '@/utils/format'
import { EmptyState } from '@/components/common/PageHeader'
import { ReservationStatusBadge } from '@/components/common/StatusBadges'

type AdminOverview = Extract<Overview, { role: 'admin' }>

export function UpcomingSection({ upcoming }: { upcoming: Reservation[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-wyndell-forest">Upcoming reservations</h2>
      {upcoming.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No upcoming reservations" message="New bookings from guests will appear here." />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {upcoming.map((reservation) => (
            <div key={reservation._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-wyndell-cream-dark bg-white p-3.5 shadow-sm">
              <div className="min-w-0">
                <Link to="/staff/reservations" className="font-mono text-sm font-bold text-wyndell-orange-dark hover:underline">
                  {reservation.reference}
                </Link>
                <p className="text-xs text-neutral-500">{reservation.customerName} · {reservation.guests} guests</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-wyndell-ink">{formatDate(reservation.date)} · {formatTime12(reservation.time)}</span>
                <span className="text-xs font-medium text-neutral-500">{reservation.branch?.name}</span>
                <ReservationStatusBadge status={reservation.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function RecentFeedbackSection({ items }: { items: FeedbackSummary[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-wyndell-forest">Recent feedback</h2>
      {items.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No feedback yet" message="Customer feedback will be summarized here." />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={item._id} className="rounded-xl border border-wyndell-cream-dark bg-white p-3.5 shadow-sm">
              <p className="text-sm text-wyndell-ink">&ldquo;{item.comment}&rdquo;</p>
              <p className="mt-1 text-xs text-neutral-500">— {item.customerName} · {item.rating}/5 stars</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function AdminSections({ overview }: { overview: AdminOverview }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-wyndell-forest">Branch performance</h2>
      <div className="mt-3 space-y-3">
        {overview.branchPerformance.map((row) => (
          <div key={row.branch.id} className="rounded-xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-wyndell-forest">{row.branch.name}</p>
                <p className="text-xs text-neutral-500">
                  {row.reservations} reservations · {row.completed} completed · {row.completionRate}% completion
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-500">Rating</p>
                <p className="text-lg font-bold text-wyndell-forest">{row.averageRating} ★</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-wyndell-sun/20 px-2 py-0.5 text-yellow-800">{row.pending} pending</span>
              <span className="rounded-full bg-wyndell-green/15 px-2 py-0.5 text-wyndell-green-dark">{row.confirmed} confirmed</span>
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-neutral-600">{row.cancelled} cancelled</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}