import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { deleteSubscriber, fetchSubscribers } from '@/services/api/newsletter'
import type { NewsletterSubscriber } from '@/types'
import { formatDateTime, friendlyError } from '@/utils/format'
import { PageHeader, Spinner, EmptyState, ErrorState } from '@/components/common/PageHeader'
import { ConfirmDialog } from '@/components/common/Modal'
import { TextInput } from '@/components/common/FormControls'
import { Badge } from '@/components/ui/badge'

/**
 * Customer management. Newsletter subscribers are the first data set here —
 * the list is deliberately shaped so reservations and other guest records can
 * join it later without a redesign.
 */
export function ManageCustomersPage() {
  const [items, setItems] = useState<NewsletterSubscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [removing, setRemoving] = useState<NewsletterSubscriber | null>(null)

  const load = () => {
    setLoading(true)
    setError(false)
    void fetchSubscribers()
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const remove = (id: string) => {
    void deleteSubscriber(id)
      .then(load)
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
      .finally(() => setRemoving(null))
  }

  const query = search.trim().toLowerCase()
  const visible = query
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) || item.email.toLowerCase().includes(query),
      )
    : items

  if (loading) {
    return <Spinner label="Loading customers…" />
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Newsletter subscribers collected from the website."
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="w-full max-w-72">
          <span className="sr-only">Search customers</span>
          <TextInput
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email…"
          />
        </label>
        <p className="text-sm text-muted-foreground">
          {visible.length} subscriber{visible.length === 1 ? '' : 's'}
        </p>
      </div>

      {error ? (
        <div className="mt-6">
          <ErrorState message="Unable to load customers right now." onRetry={load} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No subscribers yet"
            message="Signups from the home-page section and the popup will appear here."
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No matches" message="No subscriber matches that search." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-160 border-collapse text-sm">
            <thead>
              <tr className="border-b border-wyndell-cream-dark bg-wyndell-cream/60 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th scope="col" className="px-3 py-2.5">Name</th>
                <th scope="col" className="px-3 py-2.5">Email</th>
                <th scope="col" className="px-3 py-2.5">Source</th>
                <th scope="col" className="px-3 py-2.5">Subscribed</th>
                <th scope="col" className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wyndell-cream-dark/60">
              {visible.map((item) => (
                <tr key={item._id} className="hover:bg-wyndell-cream-dark/30">
                  <td className="px-3 py-2.5 font-medium text-wyndell-ink">
                    {item.name || <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-neutral-700">
                      <Mail className="size-3.5 text-wyndell-orange-dark" aria-hidden />
                      {item.email}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant="secondary"
                      className={
                        item.source === 'popup'
                          ? 'bg-wyndell-orange/10 text-wyndell-orange-dark hover:bg-wyndell-orange/20'
                          : 'bg-wyndell-green/15 text-wyndell-green-dark hover:bg-wyndell-green/20'
                      }
                    >
                      {item.source === 'popup' ? 'Popup' : 'Home page'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-neutral-500">
                    {formatDateTime(item.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setRemoving(item)}
                      className="text-xs font-medium text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={removing !== null}
        title="Remove subscriber?"
        message={
          removing
            ? `${removing.email} will be removed from the newsletter list. This can’t be undone.`
            : ''
        }
        confirmLabel="Remove"
        onConfirm={() => removing && remove(removing._id)}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}
