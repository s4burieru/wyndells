import { useEffect, useState } from 'react'
import { fetchBranches } from '../../api/branches'
import type {  Branch, SafeUser  } from '../../lib/types'
import { Button, Field, SelectInput, TextInput } from '../../components/ui/controls'
import { Modal } from '../../components/ui/Modal'

export function UserFormModal({
  user,
  onClose,
  onSave,
}: {
  user: SafeUser | null
  onClose: () => void
  onSave: (payload: Record<string, unknown>) => void
}) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>(user?.role ?? 'manager')
  const [assignedBranch, setAssignedBranch] = useState(user?.assignedBranch?.id ?? '')

  useEffect(() => {
    void fetchBranches(true).then(setBranches).catch(() => setBranches([]))
  }, [])

  const canSave = name.trim() && email.trim() && (user !== null || password.length >= 8) && (role === 'admin' || assignedBranch)

  return (
    <Modal open title={user ? `Edit ${user.name}` : 'Add a user'} onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
        </div>
        <Field label={user ? 'New password (leave blank to keep)' : 'Password'} hint="At least 8 characters.">
          <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role">
            <SelectInput value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="manager">Manager</option>
              <option value="admin">Administrator</option>
            </SelectInput>
          </Field>
          <Field label="Assigned branch">
            <SelectInput value={assignedBranch} onChange={(event) => setAssignedBranch(event.target.value)}>
              <option value="">No branch assigned</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>{branch.name}</option>
              ))}
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
              email: email.trim(),
              ...(user ? {} : { password }),
              ...(password ? { password } : {}),
              role,
              assignedBranch: assignedBranch || null,
            })
          }
          disabled={!canSave}
        >
          Save user
        </Button>
      </div>
    </Modal>
  )
}