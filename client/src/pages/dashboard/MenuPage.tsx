import { useEffect, useState } from 'react'
import { createMenuItem, deleteMenuItem, fetchMenuItems, updateMenuItem } from '@/services/api/menu'
import type { MenuItem } from '@/types'
import { formatPrice } from '@/utils/format'
import { Button } from '@/components/common/FormControls'
import { PageHeader, Spinner, EmptyState, ErrorState } from '@/components/common/PageHeader'
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

  const load = () => {
    setLoading(true)
    setError(false)
    void fetchMenuItems({ includeUnavailable: true, includeInactiveBranches: true })
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSave = (payload: Record<string, unknown>) => {
    const request = editing ? updateMenuItem(editing._id, payload) : createMenuItem(payload)
    void request
      .then(() => {
        setCreating(false)
        setEditing(null)
        load()
      })
      .catch(() => setError(true))
  }

  const handleDelete = (item: MenuItem) => {
    void deleteMenuItem(item._id).then(load).catch(() => undefined)
  }

  if (loading) {
    return <Spinner label="Loading menu…" />
  }
  if (error) {
    return <ErrorState message="Unable to load the menu right now." onRetry={load} />
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

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No menu items yet" message="Add your first dish to start serving the digital menu." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-160 border-collapse text-sm">
            <thead>
              <tr className="border-b border-wyndell-cream-dark bg-wyndell-cream/60 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Category</th>
                {user?.role === 'admin' ? <th className="px-3 py-2.5">Branch</th> : null}
                <th className="px-3 py-2.5">Price</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
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
                  {user?.role === 'admin' ? <td className="px-3 py-2.5 text-neutral-500">{item.branch?.name}</td> : null}
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatPrice(item.price)}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        void updateMenuItem(item._id, { status: item.status === 'available' ? 'unavailable' : 'available' }).then(load)
                      }
                      className={[
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        item.status === 'available' ? 'bg-wyndell-green/15 text-wyndell-green-dark' : 'bg-red-100 text-red-700',
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
                        onClick={() => {
                          if (window.confirm(`Delete "${item.name}" from the menu?`)) {
                            handleDelete(item)
                          }
                        }}
                        className="text-xs font-medium text-red-600 hover:underline"
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
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={handleSave}
        />
      ) : null}

      {showQR ? (
        <QRMenuModal
          defaultBranchId={user?.assignedBranch?.id ?? ''}
          onClose={() => setShowQR(false)}
        />
      ) : null}
    </div>
  )
}