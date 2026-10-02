import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { SearchIcon } from 'lucide-react'
import { fetchStaff } from '@/services/api/users'
import type { SafeUser } from '@/types'
import { friendlyError, roleBadgeClass, roleLabel } from '@/utils/format'
import { TextInput, SelectInput } from '@/components/common/FormControls'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from '@/components/common/PageHeader'
import { UserAvatar } from '@/components/common/UserAvatar'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/**
 * Staff directory for every signed-in staff member. Search and filters live
 * in the URL, so opening a profile and pressing Back restores this exact
 * view. Rows link to `/staff/profile/:id`, which loads that record fresh.
 */
export function StaffDirectoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [staff, setStaff] = useState<SafeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const query = searchParams.get('q') ?? ''
  const branchFilter = searchParams.get('branch') ?? ''
  const positionFilter = searchParams.get('position') ?? ''
  const statusFilter = searchParams.get('status') ?? ''
  const hasFilters = Boolean(query || branchFilter || positionFilter || statusFilter)

  const load = () => {
    setLoading(true)
    setError('')
    void fetchStaff()
      .then(setStaff)
      .catch((reason: unknown) => setError(friendlyError(reason, 'Unable to load the staff directory.')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  // Filter choices come from the loaded records, so they always match the data.
  const branchOptions = useMemo(() => {
    const options = new Map<string, string>()
    for (const member of staff) {
      if (member.assignedBranch) {
        options.set(member.assignedBranch.id, member.assignedBranch.name)
      }
    }
    return [...options.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [staff])

  const positionOptions = useMemo(() => {
    const options = new Set(
      staff.map((member) => member.position.trim()).filter((position) => position !== ''),
    )
    return [...options].sort((a, b) => a.localeCompare(b))
  }, [staff])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return staff.filter((member) => {
      if (needle && !member.name.toLowerCase().includes(needle) && !member.email.toLowerCase().includes(needle)) {
        return false
      }
      if (branchFilter && member.assignedBranch?.id !== branchFilter) {
        return false
      }
      if (positionFilter && member.position.trim() !== positionFilter) {
        return false
      }
      if (statusFilter === 'active' && !member.isActive) {
        return false
      }
      if (statusFilter === 'inactive' && member.isActive) {
        return false
      }
      return true
    })
  }, [staff, query, branchFilter, positionFilter, statusFilter])

  const openProfile = (member: SafeUser) => {
    navigate(`/staff/profile/${member.id}`, {
      state: { from: `${location.pathname}${location.search}` },
    })
  }

  return (
    <div>
      <PageHeader
        title="Staff Directory"
        subtitle="Browse team members and open a profile to see their details."
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <label className="sr-only" htmlFor="staff-search">
            Search staff by name or email
          </label>
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <TextInput
            id="staff-search"
            type="search"
            placeholder="Search name or email"
            value={query}
            onChange={(event) => setParam('q', event.target.value)}
            className="pl-9"
          />
        </div>

        <div className="w-44">
          <label className="sr-only" htmlFor="staff-branch">
            Filter by branch
          </label>
          <SelectInput
            id="staff-branch"
            value={branchFilter}
            onChange={(event) => setParam('branch', event.target.value)}
          >
            <option value="">All branches</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="w-44">
          <label className="sr-only" htmlFor="staff-position">
            Filter by position
          </label>
          <SelectInput
            id="staff-position"
            value={positionFilter}
            onChange={(event) => setParam('position', event.target.value)}
          >
            <option value="">All positions</option>
            {positionOptions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="w-40">
          <label className="sr-only" htmlFor="staff-status">
            Filter by status
          </label>
          <SelectInput
            id="staff-status"
            value={statusFilter}
            onChange={(event) => setParam('status', event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </div>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => setSearchParams({}, { replace: true })}
            className="text-xs font-medium text-muted-foreground underline transition-colors hover:text-foreground"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-6">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : null}

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonRows rows={6} />
          </div>
        ) : visible.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={hasFilters ? 'No staff match your filters' : 'No staff members yet'}
              message={
                hasFilters
                  ? 'Try a different search or clear the filters.'
                  : 'Staff accounts will appear here once they are added.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={() => setSearchParams({}, { replace: true })}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Staff member</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead className="hidden sm:table-cell">Assigned branch</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((member) => (
                <TableRow
                  key={member.id}
                  className="cursor-pointer"
                  onClick={() => openProfile(member)}
                >
                  <TableCell className="pl-4 whitespace-normal">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={member.name}
                        src={member.avatarUrl}
                        role={member.role}
                        className="shrink-0"
                      />
                      <div className="grid min-w-0 gap-0.5">
                        <span className="font-medium text-foreground wrap-break-word">
                          {member.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {member.position || member.email}
                        </span>
                        {/* Branch/status for the narrowest screens, where those columns hide. */}
                        <span className="flex flex-wrap items-center gap-1.5 sm:hidden">
                          <Badge variant="outline">{member.assignedBranch?.name ?? 'No branch'}</Badge>
                          <Badge variant={member.isActive ? 'secondary' : 'outline'}>
                            {member.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge className={roleBadgeClass(member.role)}>{roleLabel(member.role)}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {member.assignedBranch?.name ?? 'No branch'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={member.isActive ? 'secondary' : 'outline'}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="pr-4 text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button variant="outline" size="sm" onClick={() => openProfile(member)}>
                      View profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
