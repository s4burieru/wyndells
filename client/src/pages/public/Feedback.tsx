import { useEffect, useState } from 'react'
import { fetchBranches } from '../../api/branches'
import { fetchPublicFeedback, submitFeedback } from '../../api/feedback'
import type {  Branch, FeedbackSummary  } from '../../lib/types'
import { friendlyError } from '../../lib/format'
import { Button, Field, SelectInput, TextArea, TextInput } from '../../components/ui/controls'
import { Card } from '../../components/ui/display'
import { ReviewList } from './FeedbackReviews'

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
      <h1 className="font-display text-3xl font-bold text-wyndell-forest">Share your feedback</h1>
      <p className="mt-2 max-w-2xl text-wyndell-ink">
        Tell us about your experience at Wyndell&rsquo;s — your rating helps each branch improve.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-wyndell-forest">Your visit</h2>
          {submitted ? (
            <p className="mt-4 rounded-lg bg-wyndell-green/15 px-4 py-3 text-sm font-medium text-wyndell-green-dark">
              Thank you! Your feedback has been received. 🌿
            </p>
          ) : null}
          {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
          <div className="mt-4 grid gap-4">
            <Field label="Branch">
              <SelectInput value={branch} onChange={(event) => setBranch(event.target.value)}>
                <option value="">Choose a branch…</option>
                {branches.map((item) => (
                  <option key={item._id} value={item._id}>{item.name}</option>
                ))}
              </SelectInput>
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
            <div>
              <span className="mb-1 block text-sm font-medium text-wyndell-ink">How many stars?</span>
              <div className="mt-1 flex items-center gap-1">
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
            <Button onClick={() => void submit()} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit feedback'}
            </Button>
            </div>
        </Card>
        <ReviewList reviews={reviews} onRetry={() => fetchPublicFeedback().then(setReviews).catch(() => undefined)} />
      </div>
    </div>
  )
}

function StarButton({ filled, onClick, label }: { filled: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="rounded-full p-1 hover:scale-110">
      <StarGlyph filled={filled} />
    </button>
  )
}

function StarGlyph({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill={filled ? '#f9c515' : 'none'} stroke={filled ? '#f9c515' : '#d6d3d1'} strokeWidth="1.6" className="h-8 w-8" aria-hidden>
      <path d="M9.94 16.056l-5.97 4.527a.75.75 0 0 0-1.84-1.326 0 0 0-2.68-3.186c.124-.084.384-.432.55-.98 0 0-.821.41-.41.821-.82 0-1.643 0 0 .21-.131.5-.383.82 0 0-.5-.383-.21-.131-1.644-.41-.41-1.643-.82.82 0 0-0.821.41-.41.821-.82 0 0-2.68-3.184 0 0 -.384-.432-.55-.98V8.388c-.067.146-.812 1.25-1.254 1.513l1.448 1.093 1.882.91" />
    </svg>
  )
}