import { useEffect, useState } from 'react'
import { Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { deleteFeedback, fetchManageableFeedback } from '@/services/api/feedback'
import type {  Feedback  } from '@/types'
import { formatDateTime, friendlyError } from '@/utils/format'
import { PageHeader, Spinner, EmptyState, ErrorState } from '@/components/common/PageHeader'
import { ConfirmDialog } from '@/components/common/Modal'
import { StarRating } from '@/components/common/StatusBadges'
import { useAuth } from '@/contexts/AuthContext'

export function ManageFeedbackPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [removing, setRemoving] = useState<Feedback | null>(null)

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
    void deleteFeedback(id)
      .then(load)
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
      .finally(() => setRemoving(null))
  }

  if (loading) {
    return <Spinner label="Loading feedback…" />
  }

  return (
    <div>
      <PageHeader
        title="Customer feedback"
        subtitle={user?.role === 'manager' ? 'Feedback from guests at your branch.' : 'Feedback across all branches.'}
      />

      {error ? (
        <div className="mt-6">
          <ErrorState message="Unable to load feedback right now." onRetry={load} />
        </div>
      ) : items.length === 0 ? (
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
                    onClick={() => setRemoving(item)}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <blockquote className="mt-2 text-sm leading-relaxed text-wyndell-ink">&ldquo;{item.comment}&rdquo;</blockquote>
              {(item.contactNumber || item.email) ? (
                <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                  <span className="sr-only">Follow up:</span>
                  {item.contactNumber ? (
                    <span className="inline-flex items-center gap-1"><Phone className="size-3" aria-hidden />{item.contactNumber}</span>
                  ) : null}
                  {item.email ? (
                    <span className="inline-flex items-center gap-1"><Mail className="size-3" aria-hidden />{item.email}</span>
                  ) : null}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={removing !== null}
        title="Remove feedback?"
        message="This feedback will be permanently removed. This can’t be undone."
        confirmLabel="Remove"
        onConfirm={() => removing && remove(removing._id)}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}