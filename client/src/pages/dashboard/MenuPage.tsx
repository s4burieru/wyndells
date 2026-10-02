import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createMenuItem, deleteMenuItem, fetchMenuItems, updateMenuItem } from '@/services/api/menu'
import type { MenuItem } from '@/types'
import { formatPrice, friendlyError } from '@/utils/format'
import { Button } from '@/components/common/FormControls'
import { PageHeader, Spinner, EmptyState, ErrorState } from '@/components/common/PageHeader'
import { ConfirmDialog } from '@/components/common/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { MenuFormModal } from '@/features/menu/components/MenuFormModal'
import { QRMenuModal } from '@/features/menu/components/QRMenuModal'

export function ManageMenuPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [deleting, setDeleting] = useState<MenuItem | null>(null)

  const load = () => {
    setLoading(true)
    setError(false)
    void fetchMenuItems({ includeUnavailable: true, includeInactiveBranches: true })
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const closeForm = () => {
    setCreating(false)
    setEditing(null)
  }

  const handleSave = (payload: Record<string, unknown>) => {
    const request = editing ? updateMenuItem(editing._id, payload) : createMenuItem(payload)
    void request
      .then(() => {
        closeForm()
        load()
      })
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
  }

  const handleDelete = (item: MenuItem) => {
    void deleteMenuItem(item._id)
      .then(load)
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
      .finally(() => setDeleting(null))
  }

  const handleToggleStatus = (item: MenuItem) => {
    void updateMenuItem(item._id, {
      status: item.status === 'available' ? 'unavailable' : 'available',
    })
      .then(load)
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
  }

  if (loading) {
    return <Spinner label="Loading menu…" />
  }

  return (
    <div>
      <PageHeader
        title="Menu"
        subtitle={user?.role === 'manager' ? 'Manage your branch menu and availability.' : 'Manage menu items across all branches.'}
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setShowQR(true)}>
              QR menu
            </Button>
            <Button onClick={() => setCreating(true)}>+ Add menu item</Button>
          </div>
        }
      />

      {error ? (
        <div className="mt-6">
          <ErrorState message="Unable to load the menu right now." onRetry={load} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No menu items yet" message="Add your first dish to start serving the digital menu." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-160 border-collapse text-sm">
            <thead>
              <tr className="border-b border-wyndell-cream-dark bg-wyndell-cream/60 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th scope="col" className="px-3 py-2.5">Name</th>
                <th scope="col" className="px-3 py-2.5">Category</th>
                {user?.role !== 'manager' ? <th scope="col" className="px-3 py-2.5">Branch</th> : null}
                <th scope="col" className="px-3 py-2.5">Price</th>
                <th scope="col" className="px-3 py-2.5">Status</th>
                <th scope="col" className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wyndell-cream-dark/60">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-wyndell-cream-dark/30">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-wyndell-ink">{item.name}</p>
                    <p className="max-w-90 truncate text-xs text-neutral-500">{item.description}</p>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-500">{item.category}</td>
                  {user?.role !== 'manager' ? <td className="px-3 py-2.5 text-neutral-500">{item.branch?.name}</td> : null}
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatPrice(item.price)}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      aria-pressed={item.status === 'available'}
                      onClick={() => handleToggleStatus(item)}
                      className={[
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        item.status === 'available' ? 'bg-wyndell-green/15 text-wyndell-green-dark' : 'bg-destructive/10 text-destructive',
                      ].join(' ')}
                    >
                      {item.status === 'available' ? 'Available' : 'Unavailable'}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditing(item)} className="text-xs font-medium text-wyndell-orange-dark hover:underline">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(item)}
                        className="text-xs font-medium text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating || editing ? (
        <MenuFormModal
          item={editing}
          isManager={user?.role === 'manager'}
          defaultBranch={user?.assignedBranch?.id ?? ''}
          onClose={closeForm}
          onSave={handleSave}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete menu item?"
        message={deleting ? `“${deleting.name}” will be removed from the menu. This can’t be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={() => deleting && handleDelete(deleting)}
        onCancel={() => setDeleting(null)}
      />

      {showQR ? (
        <QRMenuModal
          defaultBranchId={user?.assignedBranch?.id ?? ''}
          onClose={() => setShowQR(false)}
        />
      ) : null}
    </div>
  )
}
