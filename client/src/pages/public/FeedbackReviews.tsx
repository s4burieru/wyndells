import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { fetchPublicFeedback } from '../../api/feedback'
import type { FeedbackSummary } from '../../lib/types'
import { formatDateTime } from '../../lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '../../components/ui/display'
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
      <div className="flex items-center gap-2">
        <Star className="size-5 text-wyndell-orange-dark" aria-hidden />
        <h2 className="text-lg font-semibold text-wyndell-forest">Recent reviews</h2>
      </div>
      {loading ? (
        <div className="mt-4 space-y-4">
          {[0, 1].map((key) => (
            <Card key={key}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4">
          <ErrorState message="Unable to load reviews right now." onRetry={load} />
        </div>
      ) : null}
      {!loading && !error && shown.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No reviews yet" message="Be the first to share your experience." />
        </div>
      ) : null}
      <div className="mt-4 space-y-4">
        {(reviews.length > 0 ? reviews : shown).slice(0, 10).map((review) => (
          <Card key={review._id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <StarRating value={review.rating} size="sm" />
                <span className="text-[10px] text-muted-foreground">{formatDateTime(review.createdAt)}</span>
              </div>
              <CardDescription className="text-sm leading-relaxed text-foreground">&ldquo;{review.comment}&rdquo;</CardDescription>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-xs font-medium text-muted-foreground">
                — {review.customerName}{review.branch ? ` · ${review.branch.name}` : ''}
              </CardTitle>
            </CardContent>
          </Card>
        ))}
      </div>
      {error ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void onRetry()
            load()
          }}
          className="mt-4 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Try again
        </Button>
      ) : null}
    </div>
  )
}