import { useEffect, useState } from 'react'
import { createUser, fetchUsers, setUserActive, updateUser } from '../../api/users'
import type {  SafeUser  } from '../../lib/types'
import { Button } from '../../components/ui/controls'
import { PageHeader, Spinner, EmptyState, ErrorState } from '../../components/ui/display'
import { ConfirmDialog } from '../../components/ui/Modal'
import { UserFormModal } from './UserFormModal'

export function ManageUsersPage() {
  const [users, setUsers] = useState<SafeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<SafeUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState<SafeUser | null>(null)

  const load = () => {
    setLoading(true)
    setError(false)
    void fetchUsers()
      .then(setUsers)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSave = (payload: Record<string, unknown>) => {
    const request = editing ? updateUser(editing.id, payload) : createUser(payload)
    void request
      .then(() => {
        setCreating(false)
        setEditing(null)
        load()
      })
      .catch(() => setError(true))
  }

  if (loading) {
    return <Spinner label="Loading users…" />
  }
  if (error) {
    return <ErrorState message="Unable to load users right now." onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        title="Users & Managers"
        subtitle="Create manager accounts, assign branches, and control access."
        action={<Button onClick={() => setCreating(true)}>+ Add user</Button>}
      />

      {users.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No users yet" message="Add an administrator or a branch manager." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-140 border-collapse text-sm">
            <thead>
              <tr className="border-b border-wyndell-cream-dark bg-wyndell-cream/60 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Assigned branch</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wyndell-cream-dark/60">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-wyndell-cream-dark/30">
                  <td className="px-3 py-2.5 font-medium text-wyndell-ink">{user.name}</td>
                  <td className="px-3 py-2.5 text-neutral-600">{user.email}</td>
                  <td className="px-3 py-2.5">
                    <span className={['rounded-full px-2.5 py-0.5 text-xs font-medium', user.role === 'admin' ? 'bg-wyndell-orange/15 text-wyndell-orange-dark' : 'bg-wyndell-green/15 text-wyndell-green-dark'].join(' ')}>
                      {user.role === 'admin' ? 'Admin' : 'Manager'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-500">{user.assignedBranch?.name ?? '—'}</td>
                  <td className="px-3 py-2.5 text-neutral-500">{user.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditing(user)} className="text-xs font-medium text-wyndell-orange-dark hover:underline">
                        Edit
                      </button>
                      {user.role !== 'admin' ? (
                        <button type="button" onClick={() => setConfirmToggle(user)} className="text-xs font-medium text-neutral-500 hover:underline">
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating || editing ? (
        <UserFormModal
          user={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={handleSave}
        />
      ) : null}

      <ConfirmDialog
        open={confirmToggle !== null}
        title={confirmToggle?.isActive ? 'Deactivate this account?' : 'Activate this account?'}
        message={`${confirmToggle?.name ?? ''} will ${confirmToggle?.isActive ? 'lose access to the staff portal.' : 'regain access to the staff portal.'}`}
        confirmLabel={confirmToggle?.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={() => {
          if (confirmToggle) {
            void setUserActive(confirmToggle.id, !confirmToggle.isActive).then(load)
          }
          setConfirmToggle(null)
        }}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  )
}