import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Loader2, MessageSquare, Star } from 'lucide-react'
import { fetchBranches } from '@/services/api/branches'
import { fetchPublicFeedback, submitFeedback } from '@/services/api/feedback'
import type { Branch, FeedbackSummary } from '@/types'
import { friendlyError } from '@/utils/format'
import { Field, TextArea, TextInput } from '@/components/common/FormControls'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { ReviewList } from '@/features/feedback/components/FeedbackReviews'

export function FeedbackPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [reviews, setReviews] = useState<FeedbackSummary[]>([])
  const [branch, setBranch] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [email, setEmail] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reservationReference, setReservationReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchBranches().then(setBranches).catch(() => undefined)
  }, [])

  const submit = async () => {
    if (!branch || rating < 1 || !comment.trim() || !customerName.trim()) {
      setError('Please add your name, choose a branch, pick a rating, and write a comment.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await submitFeedback({
        branch,
        customerName,
        contactNumber: contactNumber || '',
        email: email || '',
        rating,
        comment,
        reservationReference: reservationReference || '',
      })
      setSubmitted(true)
      setComment('')
      setRating(0)
      void fetchPublicFeedback().then(setReviews).catch(() => undefined)
    } catch (reason: unknown) {
      setError(friendlyError(reason))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-wyndell py-10">
      <PageHeader
        title="Share your feedback"
        subtitle="Tell us about your experience at Wyndell's — your rating helps each branch improve."
      />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="size-5 text-wyndell-orange-dark" aria-hidden />
              <CardTitle className="text-wyndell-forest">Your visit</CardTitle>
            </div>
            <CardDescription>Fields marked optional can be left blank.</CardDescription>
          </CardHeader>
          <CardContent>
          <div className="grid gap-4">
          {submitted ? (
            <Alert>
              <CircleCheck />
              <AlertDescription>Thank you! Your feedback has been received.</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
            <Field label="Branch">
              <Select value={branch || undefined} onValueChange={(value) => setBranch(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a branch…" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((item) => (
                    <SelectItem key={item._id} value={item._id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Your name">
              <TextInput value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="e.g. Maria Santos" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact number (optional)">
                <TextInput value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} placeholder="09XX XXX XXXX" />
              </Field>
              <Field label="Email (optional)">
                <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              </Field>
            </div>
            <Field label="Reservation reference (optional)">
              <TextInput value={reservationReference} onChange={(event) => setReservationReference(event.target.value)} placeholder="WYN-XXXXX" />
            </Field>
            <div className="grid gap-2" role="group" aria-label="Rating">
              <span className="text-sm font-medium">How many stars?</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarButton key={star} filled={star <= rating} onClick={() => setRating(star)} label={`${star} star${star === 1 ? '' : 's'}`} />
                ))}
              </div>
            </div>
            <Field label="Your comment">
              <TextArea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="What did you enjoy? What could be better?"
              />
            </Field>
            <Button onClick={() => void submit()} disabled={submitting} className="bg-wyndell-orange text-white hover:bg-wyndell-orange-dark">
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit feedback'
              )}
            </Button>
          </div>
          </CardContent>
        </Card>
        <ReviewList reviews={reviews} onRetry={() => fetchPublicFeedback().then(setReviews).catch(() => undefined)} />
      </div>
    </div>
  )
}

function StarButton({ filled, onClick, label }: { filled: boolean; onClick: () => void; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      aria-pressed={filled}
      className="rounded-full hover:scale-110"
    >
      <Star className={filled ? 'fill-wyndell-sun text-wyndell-sun' : 'text-muted-foreground'} aria-hidden />
    </Button>
  )
}