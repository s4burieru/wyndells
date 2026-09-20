import { useEffect, useState } from 'react'
import { fetchBranches } from '@/services/api/branches'
import type { Branch, MenuItem } from '@/types'
import { MENU_CATEGORIES } from '@/utils/format'
import { Button, Field, SelectInput, TextArea, TextInput } from '@/components/common/FormControls'
import { Modal } from '@/components/common/Modal'

export function MenuFormModal({
  item,
  isManager,
  defaultBranch,
  onClose,
  onSave,
}: {
  item: MenuItem | null
  isManager: boolean
  defaultBranch: string
  onClose: () => void
  onSave: (payload: Record<string, unknown>) => void
}) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(String(item?.price ?? ''))
  const [category, setCategory] = useState<string>(item?.category ?? 'Main Courses')
  const [status, setStatus] = useState<'available' | 'unavailable'>(item?.status ?? 'available')
  const [branch, setBranch] = useState(item?.branch?._id ?? defaultBranch)

  useEffect(() => {
    if (!isManager) {
      void fetchBranches().then(setBranches).catch(() => setBranches([]))
    }
  }, [isManager])

  const canSave = name.trim() && Number(price) >= 0 && (isManager || branch)

  return (
    <Modal open title={item ? `Edit ${item.name}` : 'Add a menu item'} onClose={onClose}>
      <div className="grid gap-4">
        {!isManager ? (
          <Field label="Branch">
            <SelectInput value={branch} onChange={(event) => setBranch(event.target.value)}>
              <option value="">Choose a branch…</option>
              {branches.map((entry) => (
                <option key={entry._id} value={entry._id}>{entry.name}</option>
              ))}
            </SelectInput>
          </Field>
        ) : null}
        <Field label="Name">
          <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Lechon Kawali" />
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price (₱)">
            <TextInput type="number" min={0} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          </Field>
          <Field label="Category">
            <SelectInput value={category} onChange={(event) => setCategory(event.target.value)}>
              {MENU_CATEGORIES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput value={status} onChange={(event) => setStatus(event.target.value as 'available' | 'unavailable')}>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </SelectInput>
          </Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
          Cancel
        </button>
        <Button
          onClick={() =>
            onSave({
              name: name.trim(),
              description: description.trim(),
              price: Number(price),
              category,
              status,
              ...(isManager ? {} : { branch }),
            })
          }
          disabled={!canSave}
        >
          Save item
        </Button>
      </div>
    </Modal>
  )
}