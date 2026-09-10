import { useEffect, useState } from 'react'
import { fetchBranches } from '../../api/branches'
import type {  Branch, DiningTable, TableStatus  } from '../../lib/types'
import { tableLabel } from '../../lib/format'
import { Button, Field, SelectInput, TextInput } from '../../components/ui/controls'
import { Modal } from '../../components/ui/Modal'

const TABLE_STATUSES: TableStatus[] = ['available', 'reserved', 'occupied', 'cleaning', 'unavailable']
const LOCATIONS = ['Main Hall', 'Garden', 'Veranda', 'Al Fresco', 'Family Corner', 'Private Room']

export function TableFormModal({
  table,
  isManager,
  defaultBranch,
  onClose,
  onSave,
}: {
  table: DiningTable | null
  isManager: boolean
  defaultBranch: string
  onClose: () => void
  onSave: (payload: Record<string, unknown>) => void
}) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [tableNumber, setTableNumber] = useState(table?.tableNumber ?? '')
  const [capacity, setCapacity] = useState(String(table?.capacity ?? 4))
  const [location, setLocation] = useState(table?.location ?? 'Main Hall')
  const [status, setStatus] = useState<string>(table?.status ?? 'available')
  const [branch, setBranch] = useState(table?.branch?._id ?? defaultBranch)

  useEffect(() => {
    if (!isManager) {
      void fetchBranches().then(setBranches).catch(() => setBranches([]))
    }
  }, [isManager])

  const canSave = tableNumber.trim() && Number(capacity) >= 1 && (isManager || branch)

  return (
    <Modal open title={table ? `Edit table ${table.tableNumber}` : 'Add a table'} onClose={onClose}>
      <div className="grid gap-4">
        {!isManager ? (
          <Field label="Branch">
            <SelectInput value={branch} onChange={(event) => setBranch(event.target.value)}>
              <option value="">Choose a branch…</option>
              {branches.map((item) => (
                <option key={item._id} value={item._id}>{item.name}</option>
              ))}
            </SelectInput>
          </Field>
        ) : null}
        <Field label="Table number">
          <TextInput value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} placeholder="e.g. T9" />
        </Field>
        <Field label="Capacity (seats)">
          <TextInput type="number" min={1} max={50} value={capacity} onChange={(event) => setCapacity(event.target.value)} />
        </Field>
        <Field label="Location">
          <SelectInput value={location} onChange={(event) => setLocation(event.target.value)}>
            {LOCATIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Status">
          <SelectInput value={status} onChange={(event) => setStatus(event.target.value)}>
            {TABLE_STATUSES.map((value) => (
              <option key={value} value={value}>{tableLabel(value)}</option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
          Cancel
        </button>
        <Button
          onClick={() =>
            onSave({
              tableNumber: tableNumber.trim(),
              capacity: Number(capacity),
              location: location.trim() || 'Main Hall',
              status,
              ...(isManager ? {} : { branch }),
            })
          }
          disabled={!canSave}
        >
          Save table
        </Button>
      </div>
    </Modal>
  )
}