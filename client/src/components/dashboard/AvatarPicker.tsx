import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { ImageUpIcon, Trash2Icon } from 'lucide-react'
import { Button } from '../ui/controls'
import { UserAvatar } from './UserAvatar'
import type { Role } from '../../lib/types'

/** Profile photos: JPG / PNG / WEBP up to 2 MB (mirrors the API limits). */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const ALLOWED_PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

/** Checks a picked photo the same way the API does, before it is uploaded. */
function validatePhoto(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_PHOTO_EXTENSIONS.includes(extension)) {
    return 'Please choose a JPG, PNG, or WEBP image.'
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'That photo is larger than 2 MB. Please choose a smaller image.'
  }
  return null
}

/**
 * Profile photo field for the staff forms: previews the chosen image, offers
 * upload / replace and remove, and holds the picked file until the form is
 * saved — so a new photo travels with the rest of the profile details.
 */
export function AvatarPicker({
  name,
  role,
  src,
  file,
  onPick,
  onRemove,
  children,
}: {
  name: string
  role: Role
  /** Photo on display (the new pick, the stored photo, or '' when there is none). */
  src: string
  /** The picked file waiting to be uploaded with the form. */
  file: File | null
  onPick: (file: File) => void
  onRemove: () => void
  children?: ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const hasPhoto = src !== ''

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0]
    // Clear the input so picking the same file again still registers.
    event.target.value = ''
    if (!picked) {
      return
    }
    const message = validatePhoto(picked)
    if (message) {
      setError(message)
      return
    }
    setError('')
    onPick(picked)
  }

  const handleRemove = () => {
    setError('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    onRemove()
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <UserAvatar name={name} src={src} role={role} size="lg" />
      <div className="grid gap-2">
        {children}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
            <ImageUpIcon />
            {hasPhoto ? 'Change photo' : 'Upload photo'}
          </Button>
          {hasPhoto ? (
            <Button type="button" variant="danger" onClick={handleRemove}>
              <Trash2Icon />
              Remove
            </Button>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          {file ? `Selected: ${file.name}` : 'JPG, PNG, or WEBP, up to 2 MB.'}
        </span>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        tabIndex={-1}
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  )
}