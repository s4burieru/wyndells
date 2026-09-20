import { useState } from 'react'
import type {  CareerDepartment, ManageableCareerPosting, PostingStatus  } from '../../lib/types'
import { Button, Field, SelectInput, TextArea, TextInput } from '../../components/ui/controls'
import { Modal } from '../../components/ui/Modal'

export function PostingFormModal({
  posting,
  branches,
  onClose,
  onSave,
}: {
  posting: ManageableCareerPosting | null
  branches: { _id: string; name: string }[]
  onClose: () => void
  onSave: (payload: Record<string, unknown>) => void
}) {
  const [branch, setBranch] = useState(posting?.branch._id ?? branches[0]?._id ?? '')
  const [title, setTitle] = useState(posting?.title ?? '')
  const [department, setDepartment] = useState<CareerDepartment>(posting?.department ?? 'restaurant')
  const [employmentType, setEmploymentType] = useState(posting?.employmentType ?? 'Full-time')
  const [status, setStatus] = useState<PostingStatus>(posting?.status ?? 'open')
  const [summary, setSummary] = useState(posting?.summary ?? '')
  const [description, setDescription] = useState(posting?.description ?? '')
  const [requirements, setRequirements] = useState(posting?.requirements ?? '')

  const lockedBranch = branches.length <= 1
  const canSave = title.trim() && branch

  return (
    <Modal open title={posting ? `Edit ${posting.title}` : 'Add a position'} onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Position title">
          <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Service Crew (Restaurant)" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Branch">
            <SelectInput value={branch} disabled={lockedBranch} onChange={(event) => setBranch(event.target.value)}>
              {branches.map((item) => (
                <option key={item._id} value={item._id}>{item.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Department">
            <SelectInput value={department} onChange={(event) => setDepartment(event.target.value as CareerDepartment)}>
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Café</option>
            </SelectInput>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employment type">
            <SelectInput value={employmentType} onChange={(event) => setEmploymentType(event.target.value)}>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput value={status} onChange={(event) => setStatus(event.target.value as PostingStatus)}>
              <option value="open">Open — accepting applications</option>
              <option value="closed">Closed</option>
            </SelectInput>
          </Field>
        </div>
        <Field label="Short summary" hint="One line shown at the top of the posting.">
          <TextInput value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="e.g. Welcoming guests and taking orders…" />
        </Field>
        <Field label="Description">
          <TextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="What does the role involve day to day?"
          />
        </Field>
        <Field label="What we're looking for">
          <TextArea
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
            rows={3}
            placeholder="Experience, availability, skills…"
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
          Cancel
        </button>
        <Button
          onClick={() =>
            onSave({
              branch,
              title: title.trim(),
              department,
              employmentType: employmentType.trim() || 'Full-time',
              status,
              summary: summary.trim(),
              description: description.trim(),
              requirements: requirements.trim(),
            })
          }
          disabled={!canSave}
        >
          Save position
        </Button>
      </div>
    </Modal>
  )
}