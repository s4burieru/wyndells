import { useEffect, useState } from 'react'
import { fetchPublicFeedback } from '../../api/feedback'
import type {  FeedbackSummary  } from '../../lib/types'
import { formatDateTime } from '../../lib/format'
import { ErrorState, Spinner } from '../../components/ui/display'
import { StarRating } from '../../components/ui/badges'

export function ReviewList({
  reviews,
  onRetry,
}: {
  reviews: FeedbackSummary[]
  onRetry: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [shown, setShown] = useState<FeedbackSummary[]>([])

  const load = () => {
    setLoading(true)
    setError(false)
    void fetchPublicFeedback()
      .then(setShown)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <div>
      <h2 className="text-lg font-semibold text-wyndell-forest">Recent reviews</h2>
      {loading ? <Spinner label="Loading reviews…" /> : null}
      {error ? <ErrorState message="Unable to load reviews right now." onRetry={load} /> : null}
      {!loading && !error && shown.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-wyndell-cream-dark bg-white p-6 text-center">
          <p className="text-sm text-neutral-500">No reviews yet — be the first to share your experience.</p>
        </div>
      ) : null}
      <div className="mt-4 space-y-4">
        {(reviews.length > 0 ? reviews : shown).slice(0, 10).map((review) => (
          <figure key={review._id} className="rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <StarRating value={review.rating} size="sm" />
              <span className="text-[10px] text-neutral-400">{formatDateTime(review.createdAt)}</span>
            </div>
            <blockquote className="mt-2 text-sm leading-relaxed text-wyndell-ink">&ldquo;{review.comment}&rdquo;</blockquote>
            <figcaption className="mt-2 text-xs font-medium text-neutral-500">
              — {review.customerName}{review.branch ? ` · ${review.branch.name}` : ''}
            </figcaption>
          </figure>
        ))}
      </div>
      {error ? (
        <button
          type="button"
          onClick={() => {
            void onRetry()
            load()
          }}
          className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}