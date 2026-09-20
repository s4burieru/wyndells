import { useEffect, useState } from 'react'
import { assignTableToReservation } from '@/services/api/reservations'
import { fetchTables } from '@/services/api/tables'
import type {  DiningTable, Reservation  } from '@/types'
import { friendlyError, formatDate, formatTime12 } from '@/utils/format'
import { Modal } from '@/components/common/Modal'

export function TableAssignmentModal({
  reservation,
  onClose,
  onAssigned,
  onError,
}: {
  reservation: Reservation
  onClose: () => void
  onAssigned: () => void
  onError: (message: string) => void
}) {
  const [tables, setTables] = useState<DiningTable[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLoading(true)
    void fetchTables({ branch: reservation.branch._id })
      .then(setTables)
      .catch(() => setTables([]))
      .finally(() => setLoading(false))
  }, [reservation.branch._id])

  const assign = (tableId: string) => {
    setBusy(true)
    void assignTableToReservation(reservation._id, tableId)
      .then(() => onAssigned())
      .catch((reason: unknown) => onError(friendlyError(reason, 'Unable to assign that table.')))
      .finally(() => setBusy(false))
  }

  return (
    <Modal open title={`Assign a table · ${reservation.reference}`} onClose={onClose}>
      <p className="text-sm text-wyndell-ink">
        {reservation.guests} guests on {formatDate(reservation.date)} at {formatTime12(reservation.time)}.
        Only tables free for this slot are listed.
      </p>
      {loading ? <p className="mt-3 text-sm text-neutral-500">Loading tables…</p> : null}
      {!loading && tables?.length === 0 ? (
        <p className="mt-3 text-sm text-red-700">No tables are available for this slot. Choose another time or reject the reservation.</p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {tables?.map((table) => (
          <button
            key={table._id}
            type="button"
            onClick={() => void assign(table._id)}
            disabled={busy}
            className="rounded-lg border border-wyndell-green-dark/30 bg-white px-3 py-2 text-left text-sm hover:bg-wyndell-green/10"
          >
            <span className="block font-semibold text-wyndell-ink">{table.tableNumber}</span>
            <span className="text-xs text-neutral-500">{table.capacity} seats · {table.location}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}