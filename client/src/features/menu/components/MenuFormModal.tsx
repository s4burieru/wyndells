import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { fetchBranches } from '@/services/api/branches'
import type { Branch, MenuItem } from '@/types'
import { MENU_CATEGORIES } from '@/utils/format'
import { Button, Field, SelectInput, TextArea, TextInput } from '@/components/common/FormControls'
import { Modal } from '@/components/common/Modal'

/** Dish photo limits — mirrors the API (JPG / PNG / WEBP, up to 4 MB). */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

/**
 * Create / edit a menu item. The dish photo is held until save and travels as
 * multipart `menuImage`, so one request creates (or updates) the row and its photo.
 */
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
  onSave: (payload: FormData) => void
}) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(String(item?.price ?? ''))
  const [category, setCategory] = useState<string>(item?.category ?? 'Main Courses')
  const [status, setStatus] = useState<'available' | 'unavailable'>(item?.status ?? 'available')
  const [branch, setBranch] = useState(item?.branch?._id ?? defaultBranch)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(item?.image ?? '')
  const [imageError, setImageError] = useState('')
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

  const canSave = name.trim() && Number(price) >= 0 && (isManager || branch) && !imageError

  const handleSave = () => {
    if (!canSave) {
      return
    }
    const form = new FormData()
    form.append('name', name.trim())
    form.append('description', description.trim())
    form.append('price', String(Number(price)))
    form.append('category', category)
    form.append('status', status)
    if (!isManager) {
      form.append('branch', branch)
    }
    if (imageFile) {
      form.append('menuImage', imageFile)
    } else if (!imagePreview) {
      // Explicit empty value clears a stored photo on the server.
      form.append('image', '')
    }
    onSave(form)
  }

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

        {/* Not a `Field`: it holds action buttons, and `Field` renders a <label>
            around its children (interactive content must not nest in a label). */}
        <div className="grid gap-2">
          <span>Dish photo</span>
          {imagePreview ? (
            <img
              src={imagePreview}
              alt=""
              className="h-32 w-full rounded-md border border-input object-cover"
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => imageInputRef.current?.click()}>
              {imagePreview ? 'Change photo' : 'Upload photo'}
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
            JPG, PNG, or WEBP, up to 4 MB. Optional — a styled placeholder is used without one.
          </span>
          {imageError ? <span className="text-xs text-destructive">{imageError}</span> : null}
        </div>

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
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave}>
          Save item
        </Button>
      </div>
    </Modal>
  )
}
