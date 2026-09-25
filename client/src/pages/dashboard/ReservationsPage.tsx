import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchReservations, updateReservationStatus } from '@/services/api/reservations'
import type {  Reservation, ReservationStatus  } from '@/types'
import { friendlyError } from '@/utils/format'
import { PageHeader, Spinner, EmptyState } from '@/components/common/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { RESERVATION_STATUS_FILTERS, ReservationDetailModal } from '@/features/reservations/components/ReservationManagement'
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
  const highlightRef = searchParams.get('ref') ?? ''

  const load = () => {
    setLoading(true)
    setError('')
    void fetchReservations({ status: filter === 'all' ? undefined : filter, date: date || undefined, limit: 100 })
      .then(({ reservations }) => setItems(reservations))
      .catch((reason: unknown) => setError(friendlyError(reason, 'Unable to load reservations.')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter, date])

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

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {RESERVATION_STATUS_FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={[
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === key ? 'bg-wyndell-orange text-white' : 'bg-white text-wyndell-ink border border-wyndell-cream-dark hover:bg-wyndell-cream-dark/60',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
        <label className="sr-only" htmlFor="reservation-date">Filter by date</label>
        <input
          id="reservation-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="ml-2 rounded-lg border border-wyndell-ink/20 bg-white px-3 py-1.5 text-sm"
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
          showBranch={user?.role === 'admin'}
          onSelect={setSelected}
          onAssign={setAssigning}
          onChangeStatus={changeStatus}
        />
      ) : null}

      {selected ? (
        <ReservationDetailModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onChange={(status) => changeStatus(selected._id, status)}
          onAssign={() => setAssigning(selected)}
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
    </div>
  )
}