import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cancelReservation, verifyReservation } from '../../api/reservations'
import type {  Reservation  } from '../../lib/types'
import { friendlyError } from '../../lib/format'
import { Button, Field, TextInput } from '../../components/ui/controls'
import { Card, Spinner } from '../../components/ui/display'
import { ConfirmDialog } from '../../components/ui/Modal'
import { ReservationDetail } from './ReservationDetail'

export function CheckReservationPage() {
  const [reference, setReference] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [result, setResult] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const check = () => {
    if (!reference.trim() || !contactNumber.trim()) {
      setError('Please provide both your reservation reference and contact number.')
      return
    }
    setLoading(true)
    setError('')
    void verifyReservation(reference.trim().toUpperCase(), contactNumber.trim())
      .then((reservation) => {
        setResult(reservation)
      })
      .catch((reason: unknown) => {
        setResult(null)
        setError(friendlyError(reason, 'No reservation matches that reference and contact number.'))
      })
      .finally(() => setLoading(false))
  }

  const confirmCancellation = () => {
    setConfirmCancel(false)
    setCancelling(true)
    void cancelReservation(reference.trim().toUpperCase(), contactNumber.trim())
      .then((reservation) => setResult(reservation))
      .catch((reason: unknown) => setError(friendlyError(reason, 'Unable to cancel this reservation.')))
      .finally(() => setCancelling(false))
  }

  return (
    <div className="container-wyndell py-10">
      <h1 className="font-display text-3xl font-bold text-wyndell-forest">Check your reservation</h1>
      <p className="mt-2 max-w-2xl text-wyndell-ink">
        Enter the reservation reference from your confirmation and the contact number you used to book.
      </p>

      <Card className="mx-auto mt-6 max-w-lg p-6">
        <div className="grid gap-4">
          <Field label="Reservation reference">
            <TextInput
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="WYN-XXXXX"
              autoCapitalize="characters"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  check()
                }
              }}
            />
          </Field>
          <Field label="Contact number" hint="The number you used when booking.">
            <TextInput
              value={contactNumber}
              onChange={(event) => setContactNumber(event.target.value)}
              placeholder="09XX XXX XXXX"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  check()
                }
              }}
            />
          </Field>
          <Button onClick={check} disabled={loading}>
            {loading ? 'Checking…' : 'Check reservation'}
          </Button>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
        </div>
      </Card>

      {loading ? (
        <div className="mt-4"><Spinner label="Verifying reservation…" /></div>
      ) : null}

      {result ? (
        <ReservationDetail
          reservation={result}
          onCancelRequest={() => setConfirmCancel(true)}
        />
      ) : null}

      <div className="mt-10 text-center">
        <p className="text-sm text-neutral-500">
          Looking to book a new table?{' '}
          <Link to="/reserve" className="font-medium text-wyndell-orange-dark hover:underline">Book a reservation</Link>
        </p>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this reservation?"
        message="Your reservation will be cancelled and the table released. This cannot be undone."
        confirmLabel={cancelling ? 'Cancelling…' : 'Yes, cancel it'}
        onConfirm={() => void confirmCancellation()}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  )
}