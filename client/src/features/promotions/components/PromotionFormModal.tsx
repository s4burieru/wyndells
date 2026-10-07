import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { fetchBranches } from '@/services/api/branches'
import type { Branch, Promotion, PromotionKind } from '@/types'
import { todayLocal } from '@/utils/format'
import { Button, Field, SelectInput, TextArea, TextInput } from '@/components/common/FormControls'
import { Modal } from '@/components/common/Modal'
import { DatePicker } from '@/components/ui/date-picker'

/** Card photo limits — mirrors the API (JPG / PNG / WEBP, up to 4 MB). */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

const KIND_LABELS: { value: PromotionKind; label: string }[] = [
  { value: 'promotion', label: 'Promotion' },
  { value: 'event', label: 'Event' },
  { value: 'announcement', label: 'Announcement' },
]

/**
 * Create / edit a promotion. The card photo is held until save and travels as
 * multipart `image`, so one request creates (or updates) the row and its photo.
 */
export function PromotionFormModal({
  promotion,
  isManager,
  defaultBranch,
  onClose,
  onSave,
}: {
  promotion: Promotion | null
  isManager: boolean
  defaultBranch: string
  onClose: () => void
  onSave: (payload: FormData) => void
}) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [title, setTitle] = useState(promotion?.title ?? '')
  const [summary, setSummary] = useState(promotion?.summary ?? '')
  const [kind, setKind] = useState<PromotionKind>(promotion?.kind ?? 'promotion')
  const [branch, setBranch] = useState(promotion?.branch?._id ?? defaultBranch)
  const [eventDate, setEventDate] = useState(promotion?.eventDate ?? todayLocal())
  const [startsOn, setStartsOn] = useState(promotion?.startsOn ?? '')
  const [expiresOn, setExpiresOn] = useState(promotion?.expiresOn ?? '')
  const [isPublished, setIsPublished] = useState(promotion?.isPublished ?? false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(promotion?.image ?? '')
  const [imageError, setImageError] = useState('')
  const [localError, setLocalError] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isManager) {
      void fetchBranches().then(setBranches).catch(() => setBranches([]))
    }
  }, [isManager])

  const handlePickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0]
    // Clear the input so picking the same file again still registers.
    event.target.value = ''
    if (!picked) {
      return
    }
    const extension = picked.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
      setImageError('Please choose a JPG, PNG, or WEBP image.')
      return
    }
    if (picked.size > MAX_IMAGE_BYTES) {
      setImageError('That image is larger than 4 MB. Please choose a smaller one.')
      return
    }
    setImageError('')
    setImageFile(picked)
    setImagePreview(URL.createObjectURL(picked))
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview('')
    setImageError('')
  }

  const canSave = title.trim() !== '' && eventDate !== '' && (isManager || branch !== '')

  const handleSave = () => {
    if (!canSave) {
      return
    }
    if (startsOn && expiresOn && startsOn > expiresOn) {
      setLocalError('The "until" date cannot be earlier than the "from" date.')
      return
    }
    setLocalError('')

    const form = new FormData()
    form.append('title', title.trim())
    form.append('summary', summary.trim())
    form.append('kind', kind)
    form.append('eventDate', eventDate)
    form.append('startsOn', startsOn)
    form.append('expiresOn', expiresOn)
    form.append('isPublished', String(isPublished))
    if (!isManager) {
      form.append('branch', branch)
    }
    if (imageFile) {
      form.append('promotionImage', imageFile)
    } else if (!imagePreview) {
      // Explicit empty value clears a stored photo on the server.
      form.append('image', '')
    }
    onSave(form)
  }

  return (
    <Modal
      open
      title={promotion ? `Edit ${promotion.title}` : 'Add a promotion'}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {promotion ? 'Save changes' : 'Create promotion'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {localError ? (
          <p role="alert" className="text-sm text-destructive">
            {localError}
          </p>
        ) : null}

        {!isManager ? (
          <Field label="Branch" hint="Leave empty to show this on the home page for every branch.">
            <SelectInput value={branch} onChange={(event) => setBranch(event.target.value)}>
              <option value="">All branches (restaurant-wide)</option>
              {branches.map((entry) => (
                <option key={entry._id} value={entry._id}>
                  {entry.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : null}

        <Field label="Title">
          <TextInput
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Sulit Sundays: 20% off family platters"
            maxLength={160}
          />
        </Field>

        <Field label="Short description" hint="Shown on the card — keep it to a sentence or two.">
          <TextArea value={summary} onChange={(event) => setSummary(event.target.value)} rows={3} maxLength={500} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <SelectInput value={kind} onChange={(event) => setKind(event.target.value as PromotionKind)}>
              {KIND_LABELS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date shown on the card">
            <DatePicker value={eventDate} onChange={setEventDate} aria-label="Date shown on the card" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shown from" hint="Optional — leave empty to show right away.">
            <DatePicker value={startsOn} onChange={setStartsOn} aria-label="Shown from" />
          </Field>
          <Field label="Until" hint="Optional — leave empty to keep it up.">
            <DatePicker value={expiresOn} onChange={setExpiresOn} aria-label="Until" />
          </Field>
        </div>

        {/* Not a `Field`: it holds action buttons, and `Field` renders a <label>
            around its children (interactive content must not nest in a label). */}
        <div className="grid gap-2">
          <span>Card image</span>
          {imagePreview ? (
            <img
              src={imagePreview}
              alt=""
              className="h-32 w-full rounded-md border border-input object-cover"
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => imageInputRef.current?.click()}>
              {imagePreview ? 'Change image' : 'Upload image'}
            </Button>
            {imagePreview ? (
              <Button type="button" variant="danger" onClick={clearImage}>
                Remove
              </Button>
            ) : null}
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            tabIndex={-1}
            className="sr-only"
            onChange={handlePickImage}
          />
          <span className="text-xs font-normal text-muted-foreground">
            JPG, PNG, or WEBP, up to 4 MB. Optional — a branded placeholder is used without one.
          </span>
          {imageError ? <span className="text-xs text-destructive">{imageError}</span> : null}
        </div>

        <Field label="Visibility">
          <SelectInput
            value={isPublished ? 'published' : 'draft'}
            onChange={(event) => setIsPublished(event.target.value === 'published')}
          >
            <option value="draft">Draft — hidden from the home page</option>
            <option value="published">Published — visible on the home page</option>
          </SelectInput>
        </Field>
      </div>
    </Modal>
  )
}
