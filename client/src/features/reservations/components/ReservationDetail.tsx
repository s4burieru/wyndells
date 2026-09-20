import { Download } from 'lucide-react'
import type { Reservation } from '../../lib/types'
import { formatDate, formatTime12 } from '../../lib/format'
import { downloadReservationReceipt } from '../../lib/receipt'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ReservationStatusBadge } from '../../components/ui/badges'

export function ReservationDetail({
  reservation,
  onCancelRequest,
  showReceiptButton = false,
}: {
  reservation: Reservation
  onCancelRequest: () => void
  showReceiptButton?: boolean
}) {
  const cancellable = reservation.status === 'pending' || reservation.status === 'confirmed'

  return (
    <Card className="mx-auto mt-8 max-w-2xl">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-mono text-lg font-bold text-wyndell-orange-dark">{reservation.reference}</CardTitle>
          <ReservationStatusBadge status={reservation.status} />
        </div>
        <CardDescription>Status updates from Wyndell&rsquo;s staff appear here. Keep your reference number handy.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="Customer" value={reservation.customerName} />
          <Detail label="Branch" value={reservation.branch?.name ?? '—'} />
          <Detail label="Date" value={formatDate(reservation.date)} />
          <Detail label="Time" value={formatTime12(reservation.time)} />
          <Detail label="Guests" value={String(reservation.guests)} />
          <Detail
            label="Assigned table"
            value={reservation.table ? `${reservation.table.tableNumber} (${reservation.table.location})` : 'Not assigned yet'}
          />
          {reservation.specialRequests ? <Detail label="Special requests" value={reservation.specialRequests} /> : null}
        </dl>
        <Separator />
        <div className="flex flex-wrap gap-2">
          {showReceiptButton ? (
            <Button
              type="button"
              onClick={() => downloadReservationReceipt(reservation)}
              className="bg-wyndell-forest text-white hover:bg-wyndell-forest/90"
            >
              <Download />
              Download receipt
            </Button>
          ) : null}
          {cancellable ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancelRequest}
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Cancel this reservation
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}