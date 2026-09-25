import { useCallback, useEffect, useState } from 'react'
import { HistoryIcon } from 'lucide-react'
import { fetchActivity, type ActivityQuery } from '@/services/api/activity'
import { fetchBranches } from '@/services/api/branches'
import { fetchUsers } from '@/services/api/users'
import type { ActivityEntry, Branch, SafeUser } from '@/types'
import { formatDateTime, friendlyError, roleBadgeClass, roleLabel } from '@/utils/format'
import { cn } from '@/utils/cn'
import { EmptyState, ErrorState, PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const PAGE_SIZE = 50

/** Filter tabs keyed by the `action` prefix stored on each row. */
const ALL = 'all'
const GROUPS = [
  { value: ALL, label: 'Everything' },
  { value: 'reservation', label: 'Reservations' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'career', label: 'Careers' },
  { value: 'user', label: 'People' },
  { value: 'branch', label: 'Branches' },
  { value: 'table', label: 'Tables' },
  { value: 'menu', label: 'Menu' },
] as const

/**
 * Admin-only audit trail: who did what, when, and at which branch. Managers
 * have no route to this page — the server enforces that independently.
 */
export function ActivityPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [group, setGroup] = useState<string>(ALL)
  const [actor, setActor] = useState('')
  const [branch, setBranch] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [staff, setStaff] = useState<SafeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const query: ActivityQuery = { page }
    if (group !== ALL) query.group = group
    if (actor) query.actor = actor
    if (branch) query.branch = branch

    void fetchActivity(query)
      .then((result) => {
        setActivities(result.activities)
        setTotal(result.total)
      })
      .catch((reason: unknown) => setError(friendlyError(reason)))
      .finally(() => setLoading(false))
  }, [page, group, actor, branch])

  useEffect(load, [load])

  // Filter dropdowns only — a failure here must not hide the log itself.
  useEffect(() => {
    void fetchBranches(true).then(setBranches).catch(() => undefined)
    void fetchUsers().then(setStaff).catch(() => undefined)
  }, [])

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle="A running audit trail of every change made across the staff portal."
        action={
          <Button variant="outline" onClick={load} disabled={loading}>
            <HistoryIcon />
            Refresh
          </Button>
        }
      />

      <Tabs
        value={group}
        onValueChange={(next) => {
          setGroup(next)
          setPage(1)
        }}
        className="mt-6"
      >
        <TabsList>
          {GROUPS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Select
          value={actor || 'any'}
          onValueChange={(next) => {
            setActor(next === 'any' ? '' : next)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-56" aria-label="Filter by staff member">
            <SelectValue placeholder="Any staff member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any staff member</SelectItem>
            {staff.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={branch || 'any'}
          onValueChange={(next) => {
            setBranch(next === 'any' ? '' : next)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-56" aria-label="Filter by branch">
            <SelectValue placeholder="Any branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any branch</SelectItem>
            {branches.map((item) => (
              <SelectItem key={item._id} value={item._id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(actor || branch || group !== ALL) && (
          <Button
            variant="ghost"
            onClick={() => {
              setActor('')
              setBranch('')
              setGroup(ALL)
              setPage(1)
            }}
          >
            Clear filters
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {total.toLocaleString('en-PH')} entr{total === 1 ? 'y' : 'ies'}
        </span>
      </div>

      {error ? (
        <div className="mt-6">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : null}

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <div className="grid gap-4 p-4" role="status" aria-busy>
            <span className="sr-only">Loading activity</span>
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Nothing recorded yet"
              message={
                actor || branch || group !== ALL
                  ? 'No activity matches these filters.'
                  : 'Changes to reservations, feedback, careers and staff accounts will show up here.'
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">When</TableHead>
                <TableHead>What happened</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="pr-4">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell className="pl-4 align-top whitespace-nowrap text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell className="min-w-64 align-top whitespace-normal">
                    {entry.summary}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    {entry.actor ? (
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{entry.actor.name}</span>
                        <Badge
                          className={cn('px-1.5 py-0 text-[0.65rem]', roleBadgeClass(entry.actor.role))}
                        >
                          {roleLabel(entry.actor.role)}
                        </Badge>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Public visitor</span>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    {entry.branch?.name ?? '—'}
                  </TableCell>
                  <TableCell className="pr-4 align-top">
                    <Badge variant="outline" className="font-mono text-[0.65rem]">
                      {entry.action}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {!loading && !error && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((n) => n + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
