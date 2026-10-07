import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { EllipsisIcon, PlusIcon } from 'lucide-react'
import { createUser, deleteUser, fetchUsers, setUserActive, updateUser } from '@/services/api/users'
import type { SafeUser } from '@/types'
import { friendlyError, roleBadgeClass, roleLabel } from '@/utils/format'
import { Button } from '@/components/common/FormControls'
import { Badge } from '@/components/ui/badge'
import { Button as IconButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, ErrorState, PageHeader } from '@/components/common/PageHeader'
import { ConfirmDialog } from '@/components/common/Modal'
import { UserAvatar } from '@/components/common/UserAvatar'
import { UserFormModal } from '@/features/users/components/UserFormModal'
import { useAuth } from '@/contexts/AuthContext'

type UserTab = 'all' | 'admin' | 'manager' | 'hr' | 'inactive'

const TABS: { value: UserTab; label: string }[] = [
  { value: 'all', label: 'All staff' },
  { value: 'admin', label: 'Administrators' },
  { value: 'manager', label: 'Managers' },
  { value: 'hr', label: 'HR' },
  { value: 'inactive', label: 'Deactivated' },
]

function matchesTab(user: SafeUser, tab: UserTab): boolean {
  if (tab === 'all') {
    return true
  }
  if (tab === 'inactive') {
    return !user.isActive
  }
  return user.role === tab
}

export function ManageUsersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  // HR is often granted a read-only view (`users.view`); everything that
  // writes needs `users.manage`, which the server enforces as well.
  const { can } = useAuth()
  const canManage = can('users.manage')
  const [users, setUsers] = useState<SafeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<UserTab>('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<SafeUser | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<SafeUser | null>(null)
  const [deleting, setDeleting] = useState<SafeUser | null>(null)

  // Profiles open as a full page in the dashboard shell; `from` routes back here.
  const openProfile = (member: SafeUser) => {
    navigate(`/staff/profile/${member.id}`, {
      state: { from: `${location.pathname}${location.search}` },
    })
  }

  const load = () => {
    setLoading(true)
    setError('')
    void fetchUsers()
      .then(setUsers)
      .catch((reason: unknown) => setError(friendlyError(reason)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSave = (payload: Record<string, unknown> | FormData) => {
    const request = editing ? updateUser(editing.id, payload) : createUser(payload)
    void request
      .then(() => {
        setCreating(false)
        setEditing(null)
        load()
      })
      .catch((reason: unknown) => setError(friendlyError(reason)))
  }

  const handleToggleActive = () => {
    const target = confirmToggle
    setConfirmToggle(null)
    if (!target) {
      return
    }
    void setUserActive(target.id, !target.isActive)
      .then(load)
      .catch((reason: unknown) => setError(friendlyError(reason)))
  }

  const handleDelete = () => {
    const target = deleting
    setDeleting(null)
    if (!target) {
      return
    }
    void deleteUser(target.id)
      .then(load)
      .catch((reason: unknown) => setError(friendlyError(reason)))
  }

  const visible = users.filter((user) => matchesTab(user, tab))
  const countFor = (value: UserTab) => users.filter((user) => matchesTab(user, value)).length

  return (
    <div>
      <PageHeader
        title="Users & Managers"
        subtitle={
          canManage
            ? 'Create staff accounts, assign branches, and manage access.'
            : 'Read-only view of staff accounts — an administrator manages changes.'
        }
        action={
          canManage ? (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              Add user
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <div className="mt-6">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(next) => setTab(next as UserTab)}
        className="mt-6"
      >
        <TabsList className="h-auto flex-wrap">
          {TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
              <span className="text-xs text-muted-foreground">{countFor(item.value)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <div className="grid gap-4 p-4" role="status" aria-busy>
            <span className="sr-only">Loading staff accounts</span>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No staff to show"
              message={
                users.length === 0
                  ? 'Add an administrator, a branch manager or an HR account.'
                  : 'Nobody matches this filter yet.'
              }
              action={canManage ? <Button onClick={() => setCreating(true)}>Add user</Button> : undefined}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Staff member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned branch</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((user) => (
                <TableRow key={user.id} className="cursor-pointer" onClick={() => openProfile(user)}>
                  <TableCell className="pl-4 whitespace-normal">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} src={user.avatarUrl} role={user.role} />
                      <div className="grid gap-0.5">
                        <button
                          type="button"
                          className="text-left font-medium text-foreground hover:underline"
                          onClick={(event) => {
                            event.stopPropagation()
                            openProfile(user)
                          }}
                        >
                          {user.name}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {user.position || user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleBadgeClass(user.role)}>{roleLabel(user.role)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.assignedBranch?.name ?? 'No branch'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.contactNumber || 'Not provided'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'secondary' : 'outline'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="pr-4 text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <IconButton
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${user.name}`}
                        >
                          <EllipsisIcon />
                        </IconButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onSelect={() => openProfile(user)}>
                          View profile
                        </DropdownMenuItem>
                        {canManage ? (
                          <>
                            <DropdownMenuItem
                              onSelect={() => {
                                setCreating(false)
                                setEditing(user)
                              }}
                            >
                              Edit details
                            </DropdownMenuItem>
                            {user.role === 'admin' ? null : (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => setConfirmToggle(user)}
                                >
                                  {user.isActive ? 'Deactivate account' : 'Activate account'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => setDeleting(user)}
                                >
                                  Delete account
                                </DropdownMenuItem>
                              </>
                            )}
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

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
        onConfirm={handleToggleActive}
        onCancel={() => setConfirmToggle(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this account?"
        message={`${deleting?.name ?? ''} will be permanently removed from the staff directory. This can’t be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
