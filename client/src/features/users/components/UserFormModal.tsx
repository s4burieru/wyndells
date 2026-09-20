import { useEffect, useState } from 'react'
import { fetchBranches } from '@/services/api/branches'
import type { Branch, Role, SafeUser } from '@/types'
import { roleLabel } from '@/utils/format'
import { AvatarPicker } from '@/components/common/AvatarPicker'
import { Button, Field, SelectInput, TextArea, TextInput } from '@/components/common/FormControls'
import { Modal } from '@/components/common/Modal'

const PHONE_PATTERN = /^[0-9+()\s.-]{7,20}$/

/**
 * Create/edit form for staff accounts.
 *
 * - Default mode (admin only): account credentials *and* profile details.
 * - `self` mode: a staff member editing their own profile — account fields
 *   (role, branch, email, password) are hidden because the API rejects them
 *   on `PATCH /api/auth/me`.
 */
export function UserFormModal({
  user,
  self = false,
  onClose,
  onSave,
}: {
  user: SafeUser | null
  self?: boolean
  onClose: () => void
  /** JSON object, or `FormData` when a profile photo is being uploaded. */
  onSave: (payload: Record<string, unknown> | FormData) => void
}) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>(user?.role ?? 'manager')
  const [assignedBranch, setAssignedBranch] = useState(user?.assignedBranch?.id ?? '')
  const [position, setPosition] = useState(user?.position ?? '')
  const [contactNumber, setContactNumber] = useState(user?.contactNumber ?? '')
  const [address, setAddress] = useState(user?.address ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  // The photo is either replaced with a picked image or removed — never retyped.
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    if (self) {
      return
    }
    void fetchBranches(true).then(setBranches).catch(() => setBranches([]))
  }, [self])

  // The preview object URL is released as soon as the pick changes.
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('')
      return
    }
    const url = URL.createObjectURL(avatarFile)
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  const shownAvatar = avatarRemoved ? '' : avatarPreview || (user?.avatarUrl ?? '')

  const previewRole: Role = self ? (user?.role ?? 'manager') : role === 'admin' ? 'admin' : 'manager'
  const phoneOk = contactNumber.trim() === '' || PHONE_PATTERN.test(contactNumber.trim())
  const accountOk =
    self ||
    (email.trim() !== '' &&
      (user !== null || password.length >= 8) &&
      (role === 'admin' || assignedBranch !== ''))
  const canSave = name.trim() !== '' && accountOk && phoneOk

  const handleSave = () => {
    const details = self
      ? { name: name.trim() }
      : {
          name: name.trim(),
          email: email.trim(),
          ...(password ? { password } : {}),
          role,
          assignedBranch: assignedBranch || null,
        }
    const profile = {
      position: position.trim(),
      contactNumber: contactNumber.trim(),
      address: address.trim(),
      bio: bio.trim(),
    }

    // The photo is untouched, so the plain JSON shape is enough.
    if (!avatarFile && !avatarRemoved) {
      onSave({ ...details, ...profile })
      return
    }

    // A photo change travels as multipart/form-data: the `avatar` file for an
    // upload, or an empty `avatarUrl` to remove the stored photo.
    const form = new FormData()
    for (const [key, value] of Object.entries({ ...details, ...profile })) {
      form.append(key, value === null || value === undefined ? '' : String(value))
    }
    if (avatarFile) {
      form.append('avatar', avatarFile)
    } else {
      form.append('avatarUrl', '')
    }
    onSave(form)
  }

  return (
    <Modal open title={self ? 'My profile' : user ? `Edit ${user.name}` : 'Add a user'} onClose={onClose}>
      <div className="grid gap-5">
        <div className="rounded-lg border bg-muted/40 p-3">
          <AvatarPicker
            name={name.trim() || 'Staff'}
            role={previewRole}
            src={shownAvatar}
            file={avatarFile}
            onPick={(picked) => {
              setAvatarFile(picked)
              setAvatarRemoved(false)
            }}
            onRemove={() => {
              setAvatarFile(null)
              setAvatarRemoved(true)
            }}
          >
            <div className="grid gap-0.5">
              <span className="text-sm font-medium text-foreground">{name.trim() || 'Full name'}</span>
              <span className="text-xs text-muted-foreground">
                {position.trim() || roleLabel(previewRole)}
              </span>
            </div>
          </AvatarPicker>
        </div>

        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {self ? 'My details' : 'Account'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <TextInput value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            {self ? null : (
              <Field label="Email">
                <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
            )}
          </div>
          {self ? null : (
            <Field
              label={user ? 'New password (leave blank to keep)' : 'Password'}
              hint="At least 8 characters."
            >
              <TextInput
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </Field>
          )}
          {self ? null : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role">
                <SelectInput value={role} onChange={(event) => setRole(event.target.value)}>
                  <option value="manager">{roleLabel('manager')}</option>
                  <option value="admin">{roleLabel('admin')}</option>
                </SelectInput>
              </Field>
              <Field label="Assigned branch">
                <SelectInput
                  value={assignedBranch}
                  onChange={(event) => setAssignedBranch(event.target.value)}
                >
                  <option value="">No branch assigned</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
          )}
        </div>
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Profile details
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job title" hint="Shown on your staff profile.">
              <TextInput
                value={position}
                placeholder="e.g. Branch Manager"
                onChange={(event) => setPosition(event.target.value)}
              />
            </Field>
            <Field label="Contact number" hint="Digits, spaces, + ( ) and - only.">
              <TextInput
                value={contactNumber}
                placeholder="e.g. 0917 123 4567"
                onChange={(event) => setContactNumber(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Address">
            <TextInput
              value={address}
              placeholder="e.g. Tanay, Rizal"
              onChange={(event) => setAddress(event.target.value)}
            />
          </Field>
          <Field label="Bio" hint="A sentence or two about your role.">
            <TextArea value={bio} onChange={(event) => setBio(event.target.value)} />
          </Field>
          {phoneOk ? null : (
            <p className="text-xs text-destructive">
              Enter a valid contact number (7 to 20 characters).
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave}>
          {self ? 'Save profile' : 'Save user'}
        </Button>
      </div>
    </Modal>
  )
}