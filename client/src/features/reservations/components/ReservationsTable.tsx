import type {  Reservation, ReservationStatus  } from '@/types'
import { formatDate, formatTime12 } from '@/utils/format'
import { ReservationStatusBadge } from '@/components/common/StatusBadges'
import { StatusActions } from '@/features/reservations/components/ReservationManagement'

export function ReservationsTable({
  items,
  showBranch,
  onSelect,
  onAssign,
  onChangeStatus,
}: {
  items: Reservation[]
  showBranch: boolean
  onSelect: (reservation: Reservation) => void
  onAssign: (reservation: Reservation) => void
  onChangeStatus: (id: string, status: ReservationStatus) => void
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-175 border-collapse text-sm">
        <thead>
          <tr className="border-b border-wyndell-cream-dark bg-wyndell-cream/60 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-3 py-2.5">Reference</th>
            <th className="px-3 py-2.5">Customer</th>
            {showBranch ? <th className="px-3 py-2.5">Branch</th> : null}
            <th className="px-3 py-2.5">Date · Time</th>
            <th className="px-3 py-2.5">Guests</th>
            <th className="px-3 py-2.5">Table</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-wyndell-cream-dark/60">
          {items.map((reservation) => (
            <tr key={reservation._id} className="hover:bg-wyndell-cream-dark/30">
              <td className="px-3 py-2.5 font-mono text-xs font-bold text-wyndell-orange-dark">
                <button type="button" onClick={() => onSelect(reservation)} className="hover:underline">
                  {reservation.reference}
                </button>
              </td>
              <td className="px-3 py-2.5">
                <p className="font-medium text-wyndell-ink">{reservation.customerName}</p>
                <p className="text-xs text-neutral-500">{reservation.contactNumber}</p>
              </td>
              {showBranch ? <td className="px-3 py-2.5 text-neutral-500">{reservation.branch?.name}</td> : null}
              <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(reservation.date)} · {formatTime12(reservation.time)}</td>
              <td className="px-3 py-2.5">{reservation.guests}</td>
              <td className="px-3 py-2.5">
                <button type="button" onClick={() => onAssign(reservation)} className="text-xs font-medium text-wyndell-green-dark hover:underline">
                  {reservation.table?.tableNumber ?? 'Assign'}
                </button>
              </td>
              <td className="px-3 py-2.5"><ReservationStatusBadge status={reservation.status} /></td>
              <td className="px-3 py-2.5 text-right">
                <StatusActions reservation={reservation} onChange={(status) => onChangeStatus(reservation._id, status)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}