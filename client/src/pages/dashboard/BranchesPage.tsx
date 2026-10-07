import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { MapPin, Mail, Phone } from 'lucide-react'
import { createBranch, deleteBranch, fetchBranches, setBranchActive, updateBranch } from '@/services/api/branches'
import type {  Branch  } from '@/types'
import { friendlyError } from '@/utils/format'
import { Button } from '@/components/common/FormControls'
import { PageHeader, Spinner, EmptyState, ErrorState } from '@/components/common/PageHeader'
import { ConfirmDialog } from '@/components/common/Modal'
import { BranchFormModal } from '@/features/branches/components/BranchFormModal'

export function ManageBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState<Branch | null>(null)
  const [deleting, setDeleting] = useState<Branch | null>(null)

  const load = () => {
    setLoading(true)
    setError(false)
    void fetchBranches(true)
      .then(setBranches)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSave = (payload: Record<string, unknown>) => {
    const request = editing ? updateBranch(editing._id, payload) : createBranch(payload)
    void request
      .then(() => {
        setCreating(false)
        setEditing(null)
        load()
      })
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
  }

  if (loading) {
    return <Spinner label="Loading branches…" />
  }

  return (
    <div>
      <PageHeader
        title="Branches"
        subtitle="Manage Wyndell's locations, contact details, and activation."
        action={<Button onClick={() => setCreating(true)}>+ Add branch</Button>}
      />

      {error ? (
        <div className="mt-6">
          <ErrorState message="Unable to load branches right now." onRetry={load} />
        </div>
      ) : branches.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No branches yet" message="Add your first branch to get started." />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {branches.map((branch) => (
            <article key={branch._id} className="rounded-2xl border border-wyndell-cream-dark bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--heading)' }}>{branch.name}</h2>
                  <p className="text-xs text-neutral-500">
                    {[branch.city, branch.hours, branch.isActive ? '' : 'Inactive'].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={['rounded-full px-2.5 py-0.5 text-xs font-medium', branch.isActive ? 'bg-wyndell-green/15 text-wyndell-green-dark' : 'bg-wyndell-taupe/25 text-wyndell-ink'].join(' ')}>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button type="button" onClick={() => setEditing(branch)} className="text-xs font-medium text-wyndell-orange-dark hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => setConfirmToggle(branch)} className="text-xs font-medium text-neutral-500 hover:underline">
                    {branch.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button type="button" onClick={() => setDeleting(branch)} className="text-xs font-medium text-destructive hover:underline">
                    Delete
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm">
                <div className="flex items-center gap-2"><dt className="sr-only">Address</dt><dd className="flex items-center gap-1.5 text-neutral-600"><MapPin className="size-3.5 shrink-0" aria-hidden />{branch.address || '—'}</dd></div>
                <div className="flex items-center gap-2"><dt className="sr-only">Phone</dt><dd className="flex items-center gap-1.5 text-neutral-600"><Phone className="size-3.5 shrink-0" aria-hidden />{branch.contactNumber || '—'}</dd></div>
                <div className="flex items-center gap-2"><dt className="sr-only">Email</dt><dd className="flex items-center gap-1.5 text-neutral-600"><Mail className="size-3.5 shrink-0" aria-hidden />{branch.email || '—'}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}

      {creating || editing ? (
        <BranchFormModal
          branch={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={handleSave}
        />
      ) : null}

      <ConfirmDialog
        open={confirmToggle !== null}
        title={confirmToggle?.isActive ? 'Deactivate this branch?' : 'Activate this branch?'}
        message={`${confirmToggle?.name ?? ''} will be ${confirmToggle?.isActive ? 'hidden from online reservations and public browsing.' : 'visible again for bookings.'}`}
        confirmLabel={confirmToggle?.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={() => {
          if (confirmToggle) {
            const branch = confirmToggle
            void setBranchActive(branch._id, !branch.isActive)
              .then(load)
              .catch((reason: unknown) => toast.error(friendlyError(reason)))
          }
          setConfirmToggle(null)
        }}
        onCancel={() => setConfirmToggle(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this branch?"
        message={`“${deleting?.name ?? ''}” will be permanently removed. This can’t be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting) {
            void deleteBranch(deleting._id)
              .then(load)
              .catch((reason: unknown) => toast.error(friendlyError(reason)))
          }
          setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}