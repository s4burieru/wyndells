import { useEffect, useState } from 'react'
import { CheckIcon, Loader2Icon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'
import { friendlyError, roleBadgeClass, roleLabel } from '@/utils/format'
import { Modal } from '@/components/common/Modal'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/components/common/PageHeader'
import { fetchChatDirectory } from '@/services/api/chat'
import type { ChatUserRef } from '@/types'

/** Loads the staff directory (everyone but yourself) while a picker is open. */
function useDirectory(open: boolean) {
  const [users, setUsers] = useState<ChatUserRef[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    fetchChatDirectory()
      .then((result) => setUsers(result.users))
      .catch((reason: unknown) => setError(friendlyError(reason)))
      .finally(() => setLoading(false))
  }, [open])

  return { users, loading, error }
}

function matches(user: ChatUserRef, query: string): boolean {
  if (!query) return true
  const needle = query.trim().toLowerCase()
  return user.name.toLowerCase().includes(needle) || roleLabel(user.role).toLowerCase().includes(needle)
}

function RoleTag({ role }: { role: ChatUserRef['role'] }) {
  return (
    <Badge className={cn('px-1.5 py-0 text-[0.65rem]', roleBadgeClass(role))}>
      {roleLabel(role)}
    </Badge>
  )
}

function DirectorySkeleton() {
  return (
    <div className="grid gap-3 py-2" role="status" aria-busy>
      <span className="sr-only">Loading staff members</span>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-3">
          <div className="size-9 animate-pulse rounded-full bg-muted" />
          <div className="grid flex-1 gap-1.5">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Picker used to start a one-to-one conversation. */
export function DirectChatModal({
  open,
  onClose,
  onStart,
}: {
  open: boolean
  onClose: () => void
  onStart: (userId: string) => Promise<void>
}) {
  const { users, loading, error } = useDirectory(open)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const start = async (userId: string) => {
    setBusyId(userId)
    try {
      await onStart(userId)
    } catch (error) {
      // Keep the picker open so the choice can be retried.
      toast.error(friendlyError(error))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal open={open} title="New message" onClose={onClose}>
      <div className="grid gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search staff members"
          aria-label="Search staff members"
        />
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <DirectorySkeleton />
        ) : users.filter((user) => matches(user, query)).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No staff members found.</p>
        ) : (
          <ul className="grid gap-1">
            {users
              .filter((user) => matches(user, query))
              .map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => void start(user.id)}
                    disabled={busyId !== null}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted disabled:opacity-60"
                  >
                    <UserAvatar name={user.name} src={user.avatarUrl} role={user.role} size="sm" />
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate text-sm font-medium">{user.name}</span>
                    </span>
                    <RoleTag role={user.role} />
                    {busyId === user.id ? (
                      <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                    ) : null}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

/** Picker used to create a named group conversation. */
export function GroupChatModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (title: string, memberIds: string[]) => Promise<void>
}) {
  const { users, loading, error } = useDirectory(open)
  const [title, setTitle] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle('')
      setQuery('')
      setSelected([])
      setSaving(false)
    }
  }, [open])

  const toggle = (userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const create = async () => {
    if (!title.trim() || selected.length === 0 || saving) return
    setSaving(true)
    try {
      await onCreate(title.trim(), selected)
    } catch (error) {
      // Keep the modal open with the typed name and selection intact.
      toast.error(friendlyError(error))
    } finally {
      setSaving(false)
    }
  }

  const visible = users.filter((user) => matches(user, query))

  return (
    <Modal
      open={open}
      title="New group"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void create()} disabled={!title.trim() || selected.length === 0 || saving}>
            {saving ? <Loader2Icon className="animate-spin" /> : null}
            Create group
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <label htmlFor="group-title" className="text-sm font-medium">
            Group name
          </label>
          <Input
            id="group-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Weekend shift"
            maxLength={80}
          />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Members</span>
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search staff members"
            aria-label="Search staff members"
          />
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <DirectorySkeleton />
        ) : visible.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No staff members found.</p>
        ) : (
          <ul className="grid max-h-64 gap-1 overflow-y-auto">
            {visible.map((user) => {
              const isSelected = selected.includes(user.id)
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => toggle(user.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-2 py-2 text-left transition-colors',
                      isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted',
                    )}
                    aria-pressed={isSelected}
                  >
                    <UserAvatar name={user.name} src={user.avatarUrl} role={user.role} size="sm" />
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate text-sm font-medium">{user.name}</span>
                    </span>
                    <RoleTag role={user.role} />
                    <span
                      className={cn(
                        'flex size-5 items-center justify-center rounded-full border',
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                      )}
                    >
                      {isSelected ? <CheckIcon className="size-3.5" /> : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}

/** Inline "add members" list used inside the group settings modal. */
export function AddMembersList({
  open,
  existingIds,
  onAdd,
}: {
  open: boolean
  existingIds: string[]
  onAdd: (memberIds: string[]) => Promise<void>
}) {
  const { users, loading, error } = useDirectory(open)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const add = async (userId: string) => {
    setBusyId(userId)
    try {
      await onAdd([userId])
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setBusyId(null)
    }
  }

  const visible = users.filter(
    (user) => !existingIds.includes(user.id) && matches(user, query),
  )

  if (!open) return null

  return (
    <div className="grid gap-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search staff members to add"
        aria-label="Search staff members to add"
      />
      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <DirectorySkeleton />
      ) : visible.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">
          Everyone matching is already in the group.
        </p>
      ) : (
        <ul className="grid max-h-52 gap-1 overflow-y-auto">
          {visible.slice(0, 30).map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => void add(user.id)}
                disabled={busyId !== null}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-muted disabled:opacity-60"
              >
                <UserAvatar name={user.name} src={user.avatarUrl} role={user.role} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{user.name}</span>
                <RoleTag role={user.role} />
                <PlusIcon className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
