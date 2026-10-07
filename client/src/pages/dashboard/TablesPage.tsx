import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { createTable, deleteTable, fetchTables, setTableStatus, updateTable } from '@/services/api/tables'
import type { DiningTable, TableStatus } from '@/types'
import { friendlyError, tableLabel } from '@/utils/format'
import { Button } from '@/components/common/FormControls'
import { PageHeader, Spinner, EmptyState, ErrorState } from '@/components/common/PageHeader'
import { TableStatusBadge } from '@/components/common/StatusBadges'
import { ConfirmDialog } from '@/components/common/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { TableFormModal } from '@/features/tables/components/TableFormModal'
import { BranchSelect } from '@/components/common/BranchSelect'

const TABLE_STATUSES: TableStatus[] = ['available', 'reserved', 'occupied', 'cleaning', 'unavailable']

export function ManageTablesPage() {
  const { user } = useAuth()
  const [tables, setTables] = useState<DiningTable[]>([])
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const branchFilter = searchParams.get('branch') ?? ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<DiningTable | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState<DiningTable | null>(null)
  const [deleting, setDeleting] = useState<DiningTable | null>(null)

  const isManager = user?.role === 'manager'

  const load = () => {
    setLoading(true)
    setError(false)
    void fetchTables({ branch: branchFilter && branchFilter !== 'all' ? branchFilter : undefined })
      .then(setTables)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [branchFilter])

  const quickStatus = (table: DiningTable, status: TableStatus) => {
    void setTableStatus(table._id, status)
      .then(load)
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
  }

  const handleSave = (payload: Record<string, unknown>) => {
    const request = editing
      ? updateTable(editing._id, payload)
      : createTable({
          ...payload,
          branch: payload.branch || user?.assignedBranch?.id || '',
        } as Record<string, unknown>)
    void request
      .then(() => {
        setCreating(false)
        setEditing(null)
        load()
      })
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
  }

  if (loading) {
    return <Spinner label="Loading tables…" />
  }

  return (
    <div>
      <PageHeader
        title="Tables"
        subtitle={user?.role === 'manager' ? 'Manage the tables in your branch.' : 'Manage tables across all branches.'}
        action={<Button onClick={() => setCreating(true)}>+ Add table</Button>}
      />

      {!isManager ? (
        <div className="mt-4">
          <BranchSelect
            value={branchFilter === 'all' ? '' : branchFilter}
            onChange={(branchId) => {
              const next = new URLSearchParams(searchParams)
              if (branchId) {
                next.set('branch', branchId)
              } else {
                next.delete('branch')
              }
              navigate(`?${next.toString()}`)
            }}
          />
        </div>
      ) : null}

      {error ? (
        <div className="mt-6">
          <ErrorState message="Unable to load tables right now." onRetry={load} />
        </div>
      ) : tables.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No tables yet" message="Add your first table to start taking bookings." />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => (
            <div key={table._id} className="rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold" style={{ color: 'var(--heading)' }}>{table.tableNumber}</h2>
                <TableStatusBadge status={table.status} />
              </div>
              <p className="mt-1 text-xs text-neutral-500">{table.capacity} seats · {table.location}</p>
              {user?.role !== 'manager' ? <p className="text-xs text-neutral-500">{table.branch?.name}</p> : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {TABLE_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={table.status === status}
                    onClick={() => quickStatus(table, status)}
                    className={[
                      'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                      table.status === status ? 'bg-wyndell-orange-dark text-white' : 'bg-wyndell-cream text-wyndell-ink hover:bg-wyndell-orange/10',
                    ].join(' ')}
                  >
                    {tableLabel(status)}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button type="button" onClick={() => setEditing(table)} className="text-xs font-medium text-wyndell-orange-dark hover:underline">
                  Edit
                </button>
                <span className="flex items-center gap-3">
                  <button type="button" onClick={() => setConfirmDeactivate(table)} className="text-xs font-medium text-destructive hover:underline">
                    Deactivate
                  </button>
                  <button type="button" onClick={() => setDeleting(table)} className="text-xs font-medium text-destructive hover:underline">
                    Delete
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating || editing ? (
        <TableFormModal
          table={editing}
          isManager={user?.role === 'manager'}
          defaultBranch={user?.assignedBranch?.id ?? ''}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={handleSave}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDeactivate !== null}
        title="Deactivate this table?"
        message={`Table ${confirmDeactivate?.tableNumber ?? ''} will no longer appear in availability. Existing reservations are kept.`}
        confirmLabel="Deactivate"
        onConfirm={() => {
          if (confirmDeactivate) {
            void updateTable(confirmDeactivate._id, { isActive: false })
              .then(load)
              .catch((reason: unknown) => toast.error(friendlyError(reason)))
          }
          setConfirmDeactivate(null)
        }}
        onCancel={() => setConfirmDeactivate(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this table?"
        message={`Table ${deleting?.tableNumber ?? ''} will be deactivated and removed from availability. Historical reservations are kept.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting) {
            void deleteTable(deleting._id)
              .then(load)
              .catch((reason: unknown) => toast.error(friendlyError(reason)))
          }
          setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
