import type {  Reservation  } from '../../lib/types'
import { formatDate, formatTime12 } from '../../lib/format'
import { downloadReservationReceipt } from '../../lib/receipt'
import { Card } from '../../components/ui/display'
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
    <Card className="mx-auto mt-8 max-w-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-lg font-bold text-wyndell-orange-dark">{reservation.reference}</h2>
        <ReservationStatusBadge status={reservation.status} />
      </div>
      <dl className="mt-5 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
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
      <div className="mt-6">
        <p className="text-xs text-neutral-500">
          Status updates from Wyndell&rsquo;s staff appear here. Keep your reference number handy.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {showReceiptButton ? (
            <button
              type="button"
              onClick={() => downloadReservationReceipt(reservation)}
              className="rounded-lg bg-wyndell-forest px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              ⬇ Download receipt
            </button>
          ) : null}
          {cancellable ? (
            <button
              type="button"
              onClick={onCancelRequest}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Cancel this reservation
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="font-medium text-wyndell-ink">{value}</dd>
    </div>
  )
}