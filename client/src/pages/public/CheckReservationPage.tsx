import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CircleAlert, Loader2, Search } from 'lucide-react'
import { cancelReservation, verifyReservation } from '@/services/api/reservations'
import type { Reservation } from '@/types'
import { friendlyError } from '@/utils/format'
import { Field, TextInput } from '@/components/common/FormControls'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { ConfirmDialog } from '@/components/common/Modal'
import { ReservationDetail } from '@/features/reservations/components/ReservationDetail'

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
      <PageHeader
        title="Check your reservation"
        subtitle="Enter the reservation reference from your confirmation and the contact number you used to book."
      />

      <Card className="mx-auto mt-6 max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-wyndell-forest">
            <Search className="size-5 text-wyndell-orange-dark" aria-hidden />
            Find your booking
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
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
          <Button onClick={check} disabled={loading} className="bg-wyndell-orange text-white hover:bg-wyndell-orange-dark">
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Checking…
              </>
            ) : (
              'Check reservation'
            )}
          </Button>
          {error ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <Card className="mx-auto mt-4 max-w-2xl">
          <CardContent className="grid gap-2 pt-6">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <ReservationDetail
          reservation={result}
          onCancelRequest={() => setConfirmCancel(true)}
          showReceiptButton
        />
      ) : null}

      <div className="mt-10 flex justify-center">
        <Button asChild variant="link" className="text-wyndell-orange-dark">
          <Link to="/reserve">
            Looking to book a new table? Book a reservation
            <ArrowRight />
          </Link>
        </Button>
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