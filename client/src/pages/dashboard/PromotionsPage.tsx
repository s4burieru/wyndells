import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import {
  createPromotion,
  deletePromotion,
  fetchManageablePromotions,
  updatePromotion,
} from '@/services/api/promotions'
import type { Promotion, PromotionKind } from '@/types'
import { formatDate, friendlyError } from '@/utils/format'
import { Button } from '@/components/common/FormControls'
import { PageHeader, Spinner, EmptyState, ErrorState } from '@/components/common/PageHeader'
import { ConfirmDialog } from '@/components/common/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { BranchSelect } from '@/components/common/BranchSelect'
import { PromotionFormModal } from '@/features/promotions/components'

const KIND_LABELS: Record<PromotionKind, string> = {
  promotion: 'Promotion',
  event: 'Event',
  announcement: 'Announcement',
}

export function ManagePromotionsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Promotion | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const branchFilter = searchParams.get('branch') ?? ''

  const isManager = user?.role === 'manager'

  const load = () => {
    setLoading(true)
    setError(false)
    void fetchManageablePromotions(
      branchFilter && branchFilter !== 'all' ? branchFilter : undefined,
    )
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [branchFilter])

  const closeForm = () => {
    setCreating(false)
    setEditing(null)
  }

  const handleSave = (payload: FormData) => {
    const request = editing ? updatePromotion(editing._id, payload) : createPromotion(payload)
    void request
      .then(() => {
        closeForm()
        load()
        toast.success(editing ? 'Promotion updated.' : 'Promotion created.')
      })
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
  }

  const handleDelete = (item: Promotion) => {
    void deletePromotion(item._id)
      .then(load)
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
      .finally(() => setDeleting(null))
  }

  const handleTogglePublished = (item: Promotion) => {
    void updatePromotion(item._id, { isPublished: !item.isPublished })
      .then(load)
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
  }

  if (loading) {
    return <Spinner label="Loading promotions…" />
  }

  return (
    <div>
      <PageHeader
        title="Promotions"
        subtitle={
          isManager
            ? 'Promotions, events and announcements for your branch.'
            : 'Home-page promotions, events and announcements across all branches.'
        }
        action={<Button onClick={() => setCreating(true)}>+ Add promotion</Button>}
      />

      {!isManager ? (
        <div className="mt-4">
          <BranchSelect
            value={branchFilter === 'all' ? '' : branchFilter}
            onChange={(branchId) => {
              const next = new URLSearchParams(searchParams)
              if (branchId) {
                next.set('branch', branchId)
              } else {
                next.delete('branch')
              }
              setSearchParams(next)
            }}
          />
        </div>
      ) : null}

      {error ? (
        <div className="mt-6">
          <ErrorState message="Unable to load promotions right now." onRetry={load} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No promotions yet"
            message="Add your first promotion, event or announcement to show it on the home page."
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-160 border-collapse text-sm">
            <thead>
              <tr className="border-b border-wyndell-cream-dark bg-wyndell-cream/60 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th scope="col" className="px-3 py-2.5">Title</th>
                <th scope="col" className="px-3 py-2.5">Type</th>
                {!isManager ? <th scope="col" className="px-3 py-2.5">Branch</th> : null}
                <th scope="col" className="px-3 py-2.5">Date</th>
                <th scope="col" className="px-3 py-2.5">Status</th>
                <th scope="col" className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wyndell-cream-dark/60">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-wyndell-cream-dark/30">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-wyndell-ink">{item.title}</p>
                    <p className="max-w-90 truncate text-xs text-neutral-500">{item.summary}</p>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-500">{KIND_LABELS[item.kind]}</td>
                  {!isManager ? (
                    <td className="px-3 py-2.5 text-neutral-500">
                      {item.branch?.name ?? 'All branches'}
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 whitespace-nowrap text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" aria-hidden />
                      {formatDate(item.eventDate)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      aria-pressed={item.isPublished}
                      onClick={() => handleTogglePublished(item)}
                      className={[
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        item.isPublished
                          ? 'bg-wyndell-green/15 text-wyndell-green-dark'
                          : 'bg-neutral-100 text-neutral-500',
                      ].join(' ')}
                    >
                      {item.isPublished ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className="text-xs font-medium text-wyndell-orange-dark hover:underline"
                      >
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
        <PromotionFormModal
          promotion={editing}
          isManager={isManager}
          defaultBranch={user?.assignedBranch?.id ?? ''}
          onClose={closeForm}
          onSave={handleSave}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete promotion?"
        message={deleting ? `“${deleting.title}” will be removed from the home page. This can’t be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={() => deleting && handleDelete(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
