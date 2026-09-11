import { useEffect, useState } from 'react'
import { deleteFeedback, fetchManageableFeedback } from '../../api/feedback'
import type {  Feedback  } from '../../lib/types'
import { formatDateTime } from '../../lib/format'
import { PageHeader, Spinner, EmptyState, ErrorState } from '../../components/ui/display'
import { StarRating } from '../../components/ui/badges'
import { useAuth } from '../../lib/auth'

export function ManageFeedbackPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = () => {
    setLoading(true)
    setError(false)
    void fetchManageableFeedback()
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const remove = (id: string) => {
    void deleteFeedback(id).then(load).catch(() => undefined)
  }

  if (loading) {
    return <Spinner label="Loading feedback…" />
  }
  if (error) {
    return <ErrorState message="Unable to load feedback right now." onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        title="Customer feedback"
        subtitle={user?.role === 'manager' ? 'Feedback from guests at your branch.' : 'Feedback across all branches.'}
      />

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No feedback yet" message="Customer reviews will appear here." />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <article key={item._id} className="rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-wyndell-ink">{item.customerName}</p>
                  <p className="text-xs text-neutral-500">
                    {item.branch?.name} · {formatDateTime(item.createdAt)}
                    {item.reservationReference ? ` · ${item.reservationReference}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating value={item.rating} size="sm" />
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Remove this feedback?')) {
                        remove(item._id)
                      }
                    }}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <blockquote className="mt-2 text-sm leading-relaxed text-wyndell-ink">&ldquo;{item.comment}&rdquo;</blockquote>
              {(item.contactNumber || item.email) ? (
                <p className="mt-2 text-xs text-neutral-500">
                  Follow up: {item.contactNumber ? `📞 ${item.contactNumber}` : ''}{item.contactNumber && item.email ? ' · ' : ''}{item.email ? `✉️ ${item.email}` : ''}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}