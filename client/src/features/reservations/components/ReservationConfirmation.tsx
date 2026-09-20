import { useEffect, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { Check, Download } from 'lucide-react'
import type { Reservation } from '../../lib/types'
import { formatDate, formatTime12 } from '../../lib/format'
import { downloadReservationReceipt } from '../../lib/receipt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function ReservationConfirmationPage({
  reservation,
  autoDownloadedRef,
}: {
  reservation: Reservation
  autoDownloadedRef?: RefObject<string | null>
}) {
  const [autoDownloaded, setAutoDownloaded] = useState(false)

  // Sync the auto-download flag set during submit (kept in a ref so the
  // download can stay inside the submit click handler browsers allow).

  // Fallback: if the automatic download during submit was blocked/skipped
  // (e.g. the user gesture expired while the request was in flight),
  // try once more when the confirmation screen mounts.
  useEffect(() => {
    if (autoDownloadedRef?.current === reservation.reference) {
      setAutoDownloaded(true)
      return
    }
    try {
      downloadReservationReceipt(reservation)
      if (autoDownloadedRef) {
        autoDownloadedRef.current = reservation.reference
      }
      setAutoDownloaded(true)
    } catch {
      setAutoDownloaded(false)
    }
    // Run once per reservation reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation.reference])

  const handleDownload = () => {
    downloadReservationReceipt(reservation)
    setAutoDownloaded(true)
    if (autoDownloadedRef) {
      autoDownloadedRef.current = reservation.reference
    }
  }
  return (
    <div className="container-wyndell py-12">
      <Card className="mx-auto max-w-xl border-wyndell-green/40 text-center">
        <CardHeader>
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-wyndell-green/15" aria-hidden>
            <Check className="size-8 text-wyndell-green-dark" />
          </span>
          <CardTitle className="mt-2 font-display text-2xl font-bold text-wyndell-forest">Reservation submitted successfully</CardTitle>
          <CardDescription>
            {autoDownloaded
              ? 'Your receipt has been downloaded automatically — it includes your reservation reference.'
              : 'Please save your reservation reference. You’ll need it to check your reservation status.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 text-left">
          <div className="rounded-xl border border-dashed bg-muted/40 px-6 py-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reservation reference</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-wide text-wyndell-orange-dark">{reservation.reference}</p>
            <Button
              type="button"
              onClick={handleDownload}
              className="mt-3 bg-wyndell-forest text-white hover:bg-wyndell-forest/90"
            >
              <Download />
              {autoDownloaded ? 'Download receipt again' : 'Download receipt'}
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Receipt file: Wyndells-Reservation-{reservation.reference}.pdf
            </p>
          </div>

          <div>
            <Badge variant="secondary" className="bg-wyndell-sun/20 text-yellow-800 hover:bg-wyndell-sun/25">Pending — awaiting confirmation</Badge>
            <dl className="mt-3 grid gap-2 text-sm">
            <Row label="Name" value={reservation.customerName} />
            <Row label="Branch" value={reservation.branch?.name ?? '—'} />
            <Row label="Date" value={formatDate(reservation.date)} />
            <Row label="Time" value={formatTime12(reservation.time)} />
            <Row label="Guests" value={String(reservation.guests)} />
            {reservation.specialRequests ? <Row label="Requests" value={reservation.specialRequests} /> : null}
            </dl>
            <Separator className="mt-4" />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="bg-wyndell-orange text-white hover:bg-wyndell-orange-dark">
                <Link to="/check">Check reservation status</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/menu">Browse the menu</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b py-1.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}