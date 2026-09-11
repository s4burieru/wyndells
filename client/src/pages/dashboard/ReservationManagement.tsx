import type { Reservation, ReservationStatus } from '../../lib/types'
import { formatDate, formatTime12 } from '../../lib/format'
import { Modal } from '../../components/ui/Modal'
import { ReservationStatusBadge } from '../../components/ui/badges'

export const RESERVATION_STATUS_FILTERS: ['all' | ReservationStatus, string][] = [
  ['all', 'All'],
  ['pending', 'Pending'],
  ['confirmed', 'Confirmed'],
  ['completed', 'Completed'],
  ['rejected', 'Rejected'],
  ['cancelled', 'Cancelled'],
  ['no-show', 'No-show'],
]

const TRANSITIONS: Record<ReservationStatus, { status: ReservationStatus; label: string }[]> = {
  pending: [
    { status: 'confirmed', label: 'Confirm' },
    { status: 'rejected', label: 'Reject' },
    { status: 'cancelled', label: 'Cancel' },
  ],
  confirmed: [
    { status: 'completed', label: 'Complete' },
    { status: 'no-show', label: 'No-show' },
    { status: 'cancelled', label: 'Cancel' },
  ],
  rejected: [],
  cancelled: [],
  completed: [],
  'no-show': [],
}

export function StatusActions({
  reservation,
  onChange,
}: {
  reservation: Reservation
  onChange: (status: ReservationStatus) => void
}) {
  const actions = TRANSITIONS[reservation.status]
  if (actions.length === 0) {
    return <span className="text-xs text-neutral-400">—</span>
  }
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {actions.map((action) => (
        <button
          key={action.status}
          type="button"
          onClick={() => onChange(action.status)}
          className={[
            'rounded-md px-2 py-1 text-xs font-medium transition-colors',
            action.status === 'rejected' || action.status === 'cancelled' || action.status === 'no-show'
              ? 'text-red-700 hover:bg-red-50'
              : 'text-wyndell-green-dark hover:bg-wyndell-green/10',
          ].join(' ')}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

export function ReservationDetailModal({
  reservation,
  onClose,
  onChange,
  onAssign,
}: {
  reservation: Reservation
  onClose: () => void
  onChange: (status: ReservationStatus) => void
  onAssign: () => void
}) {
  return (
    <Modal open title={`Reservation ${reservation.reference}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <ReservationStatusBadge status={reservation.status} />
          {reservation.contactNumber ? <span className="text-neutral-500">{reservation.contactNumber}</span> : null}
        </div>
        <DetailRow label="Customer" value={reservation.customerName} />
        <DetailRow label="Branch" value={reservation.branch?.name ?? '—'} />
        <DetailRow label="When" value={`${formatDate(reservation.date)} at ${formatTime12(reservation.time)}`} />
        <DetailRow label="Guests" value={String(reservation.guests)} />
        <DetailRow label="Email" value={reservation.email} />
        <DetailRow label="Table" value={reservation.table ? `${reservation.table.tableNumber} · ${reservation.table.location}` : 'Not assigned'} />
        {reservation.specialRequests ? <DetailRow label="Requests" value={reservation.specialRequests} /> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {TRANSITIONS[reservation.status].map((action) => (
          <button
            key={action.status}
            type="button"
            onClick={() => onChange(action.status)}
            className={[
              'rounded-lg px-3 py-1.5 text-sm font-semibold',
              action.status === 'completed' || action.status === 'confirmed'
                ? 'bg-wyndell-green-dark text-white hover:bg-wyndell-green'
                : action.status === 'rejected' || action.status === 'cancelled' || action.status === 'no-show'
                  ? 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
                  : 'bg-wyndell-orange text-white hover:bg-wyndell-orange-dark',
            ].join(' ')}
          >
            {action.label}
          </button>
        ))}
        {reservation.status === 'pending' || reservation.status === 'confirmed' ? (
          <button
            type="button"
            onClick={onAssign}
            className="rounded-lg border border-wyndell-green-dark/30 bg-white px-3 py-1.5 text-sm font-semibold text-wyndell-green-dark hover:bg-wyndell-green/10"
          >
            Assign table
          </button>
        ) : null}
      </div>
    </Modal>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</span>
      <span className="font-medium text-wyndell-ink">{value}</span>
    </div>
  )
}