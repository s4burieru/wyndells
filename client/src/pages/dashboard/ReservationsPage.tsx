import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { deleteReservation, fetchReservations, updateReservationStatus } from '@/services/api/reservations'
import type {  Reservation, ReservationStatus  } from '@/types'
import { friendlyError } from '@/utils/format'
import { PageHeader, Spinner, EmptyState, ErrorState } from '@/components/common/PageHeader'
import { ConfirmDialog } from '@/components/common/Modal'
import { DatePicker } from '@/components/ui/date-picker'
import { useAuth } from '@/contexts/AuthContext'
import { RESERVATION_STATUS_FILTERS, ReservationDetailModal } from '@/features/reservations/components/ReservationManagement'
import { BranchSelect } from '@/components/common/BranchSelect'
import { ReservationsTable } from '@/features/reservations/components/ReservationsTable'
import { TableAssignmentModal } from '@/features/reservations/components/TableAssignmentModal'

export function ManageReservationsPage() {
  const { user } = useAuth()
  // Notifications deep-link here with `?ref=RD-1234` to open that booking.
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<Reservation[]>([])
  const [filter, setFilter] = useState<'all' | ReservationStatus>('all')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [assigning, setAssigning] = useState<Reservation | null>(null)
  const [deleting, setDeleting] = useState<Reservation | null>(null)
  const highlightRef = searchParams.get('ref') ?? ''
  const branchFilter = searchParams.get('branch') ?? ''

  const load = () => {
    setLoading(true)
    setError('')
    void fetchReservations({
      status: filter === 'all' ? undefined : filter,
      date: date || undefined,
      branch: branchFilter && branchFilter !== 'all' ? branchFilter : undefined,
      limit: 100,
    })
      .then(({ reservations }) => setItems(reservations))
      .catch((reason: unknown) => setError(friendlyError(reason, 'Unable to load reservations.')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter, date, branchFilter])

  // Open the booking a notification pointed at, then drop the parameter so a
  // refresh or a later navigation doesn't reopen a stale detail modal. The
  // lookup runs once the first page has loaded; a booking outside the window
  // simply leaves the list untouched.
  useEffect(() => {
    if (!highlightRef || loading) return
    const match = items.find(
      (item) => item.reference.toUpperCase() === highlightRef.toUpperCase(),
    )
    if (match) {
      setSelected(match)
    }
    setSearchParams({}, { replace: true })
  }, [highlightRef, loading, items, setSearchParams])

  const deleteOne = (id: string) => {
    setError('')
    void deleteReservation(id)
      .then(() => {
        setSelected(null)
        load()
      })
      .catch((reason: unknown) => setError(friendlyError(reason, 'Unable to delete the reservation.')))
      .finally(() => setDeleting(null))
  }

  const changeStatus = (id: string, status: ReservationStatus) => {
    setError('')
    void updateReservationStatus(id, status)
      .then(() => {
        setSelected(null)
        load()
      })
      .catch((reason: unknown) => setError(friendlyError(reason, 'Unable to update the reservation.')))
  }

  return (
    <div>
      <PageHeader
        title="Reservations"
        subtitle={`${user?.role === 'manager' ? 'My branch' : 'All branches'} · ${filter === 'all' ? 'all statuses' : filter}.`}
      />

      {error ? (
        <div className="mt-6">
          <ErrorState message={error} />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {user?.role !== 'manager' ? (
          <BranchSelect
            value={branchFilter === 'all' ? '' : branchFilter}
            onChange={(branchId) => {
              const next = new URLSearchParams(searchParams)
              if (branchId) {
                next.set('branch', branchId)
              } else {
                next.delete('branch')
              }
              setSearchParams(next)
            }}
          />
        ) : null}
        {RESERVATION_STATUS_FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={[
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === key ? 'bg-wyndell-orange-dark text-white' : 'bg-white text-wyndell-ink border border-wyndell-cream-dark hover:bg-wyndell-cream-dark/60',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
        <label className="sr-only" htmlFor="reservation-date">Filter by date</label>
        <DatePicker
          id="reservation-date"
          value={date}
          onChange={setDate}
          placeholder="Filter by date"
          className="ml-2 w-auto"
        />
        {date ? (
          <button type="button" onClick={() => setDate('')} className="text-xs font-medium text-neutral-500 underline">
            Clear date
          </button>
        ) : null}
      </div>

      {loading ? <div className="mt-6"><Spinner label="Loading reservations…" /></div> : null}
      {!loading && items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No reservations found" message="Try a different status or date filter." />
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <ReservationsTable
          items={items}
          showBranch={user?.role !== 'manager'}
          onSelect={setSelected}
          onAssign={setAssigning}
          onChangeStatus={changeStatus}
          onDelete={setDeleting}
        />
      ) : null}

      {selected ? (
        <ReservationDetailModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onChange={(status) => changeStatus(selected._id, status)}
          onAssign={() => setAssigning(selected)}
          onDelete={() => setDeleting(selected)}
        />
      ) : null}
      {assigning ? (
        <TableAssignmentModal
          reservation={assigning}
          onClose={() => setAssigning(null)}
          onAssigned={() => {
            setAssigning(null)
            load()
          }}
          onError={(message) => setError(message)}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this reservation?"
        message={deleting ? `Reservation ${deleting.reference} (${deleting.customerName}) will be permanently removed. This can’t be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={() => deleting && deleteOne(deleting._id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
