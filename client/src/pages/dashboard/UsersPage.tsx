import { useEffect, useState } from 'react'
import { EllipsisIcon, PlusIcon } from 'lucide-react'
import { createUser, fetchUsers, setUserActive, updateUser } from '@/services/api/users'
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
import { UserProfileSheet } from '@/features/users/components/UserProfileSheet'

type UserTab = 'all' | 'admin' | 'manager' | 'inactive'

const TABS: { value: UserTab; label: string }[] = [
  { value: 'all', label: 'All staff' },
  { value: 'admin', label: 'Administrators' },
  { value: 'manager', label: 'Managers' },
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
  const [users, setUsers] = useState<SafeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<UserTab>('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<SafeUser | null>(null)
  const [viewing, setViewing] = useState<SafeUser | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<SafeUser | null>(null)

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

  const visible = users.filter((user) => matchesTab(user, tab))
  const countFor = (value: UserTab) => users.filter((user) => matchesTab(user, value)).length

  return (
    <div>
      <PageHeader
        title="Users & Managers"
        subtitle="Create manager accounts, assign branches, and manage staff profiles."
        action={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            Add user
          </Button>
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
        <TabsList>
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
                  ? 'Add an administrator or a branch manager.'
                  : 'Nobody matches this filter yet.'
              }
              action={<Button onClick={() => setCreating(true)}>Add user</Button>}
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
                <TableRow key={user.id} className="cursor-pointer" onClick={() => setViewing(user)}>
                  <TableCell className="pl-4 whitespace-normal">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} src={user.avatarUrl} role={user.role} />
                      <div className="grid gap-0.5">
                        <span className="font-medium text-foreground">{user.name}</span>
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
                        <DropdownMenuItem onSelect={() => setViewing(user)}>
                          View profile
                        </DropdownMenuItem>
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
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <UserProfileSheet user={viewing} open={viewing !== null} onClose={() => setViewing(null)} />

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
    </div>
  )
}