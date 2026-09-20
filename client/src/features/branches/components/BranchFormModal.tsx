import { useState } from 'react'
import type {  Branch  } from '../../lib/types'
import { Button, Field, TextInput } from '../../components/ui/controls'
import { Modal } from '../../components/ui/Modal'

export function BranchFormModal({
  branch,
  onClose,
  onSave,
}: {
  branch: Branch | null
  onClose: () => void
  onSave: (payload: Record<string, unknown>) => void
}) {
  const [name, setName] = useState(branch?.name ?? '')
  const [code, setCode] = useState(branch?.code ?? '')
  const [address, setAddress] = useState(branch?.address ?? '')
  const [city, setCity] = useState(branch?.city ?? '')
  const [contactNumber, setContactNumber] = useState(branch?.contactNumber ?? '')
  const [email, setEmail] = useState(branch?.email ?? '')
  const [hours, setHours] = useState(branch?.hours ?? '')
  const [description, setDescription] = useState(branch?.description ?? '')
  const [image, setImage] = useState(branch?.image ?? '')

  const canSave = name.trim() && code.trim()

  return (
    <Modal open title={branch ? `Edit ${branch.name}` : 'Add a branch'} onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Branch name">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sampaloc, Tanay" />
          </Field>
          <Field label="Code" hint="Used for URLs and reports.">
            <TextInput value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. sampaloc-tanay" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address">
            <TextInput value={address} onChange={(event) => setAddress(event.target.value)} />
          </Field>
          <Field label="City / area">
            <TextInput value={city} onChange={(event) => setCity(event.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact number">
            <TextInput value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
        </div>
        <Field label="Opening hours">
          <TextInput value={hours} onChange={(event) => setHours(event.target.value)} placeholder="10:00 AM – 10:00 PM" />
        </Field>
        <Field label="Description">
          <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <Field label="Image URL" hint="Optional photo shown at the top of the branch's public page.">
          <TextInput value={image} onChange={(event) => setImage(event.target.value)} placeholder="https://…" />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
          Cancel
        </button>
        <Button
          onClick={() =>
            onSave({
              name: name.trim(),
              code: code.trim(),
              address: address.trim(),
              city: city.trim(),
              contactNumber: contactNumber.trim(),
              email: email.trim(),
              hours: hours.trim(),
              description: description.trim(),
              image: image.trim(),
            })
          }
          disabled={!canSave}
        >
          Save branch
        </Button>
      </div>
    </Modal>
  )
}