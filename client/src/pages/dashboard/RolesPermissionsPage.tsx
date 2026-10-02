import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { LockIcon, RotateCcwIcon, SaveIcon } from 'lucide-react'
import {
  fetchRolePermissions,
  saveRolePermissions,
  type ConfigurableRoleKey,
  type RoleMatrix,
  type RolePermissionsResult,
} from '@/services/api/roles'
import type { Permission } from '@/types'
import { friendlyError } from '@/utils/format'
import { Button } from '@/components/common/FormControls'
import { ErrorState, PageHeader, Spinner } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const EDITABLE_ROLES: ConfigurableRoleKey[] = ['manager', 'hr']

/** Stable comparison key so "did anything change?" never depends on ordering. */
function keyOf(permissions: readonly Permission[]): string {
  return [...permissions].sort().join('|')
}

function toggle(permissions: readonly Permission[], permission: Permission): Permission[] {
  return permissions.includes(permission)
    ? permissions.filter((key) => key !== permission)
    : [...permissions, permission]
}

/**
 * Admin screen that turns role access into configuration: every permission is
 * a checkbox per editable role, saved straight to `role_permissions` on the
 * server. Administrators are locked to full access by design.
 */
export function RolesPermissionsPage() {
  const [catalog, setCatalog] = useState<RolePermissionsResult | null>(null)
  const [saved, setSaved] = useState<RoleMatrix | null>(null)
  const [draft, setDraft] = useState<RoleMatrix | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    void fetchRolePermissions()
      .then((result) => {
        setCatalog(result)
        setSaved(result.matrix)
        setDraft(result.matrix)
      })
      .catch((reason: unknown) => setError(friendlyError(reason)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const dirty = useMemo(() => {
    if (!saved || !draft) {
      return false
    }
    return EDITABLE_ROLES.some((role) => keyOf(saved[role]) !== keyOf(draft[role]))
  }, [saved, draft])

  const handleToggle = (role: ConfigurableRoleKey, permission: Permission) => {
    setDraft((current) => (current ? { ...current, [role]: toggle(current[role], permission) } : current))
  }

  const handleSave = () => {
    if (!saved || !draft) {
      return
    }
    const changed = EDITABLE_ROLES.filter((role) => keyOf(saved[role]) !== keyOf(draft[role]))
    if (changed.length === 0) {
      return
    }
    setSaving(true)
    void Promise.all(changed.map((role) => saveRolePermissions(role, [...draft[role]].sort())))
      .then(() => {
        toast.success('Role permissions updated.')
        load()
      })
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
      .finally(() => setSaving(false))
  }

  if (loading) {
    return <Spinner label="Loading permissions…" />
  }

  if (error || !catalog || !draft) {
    return <ErrorState message={error || 'Unable to load role permissions.'} onRetry={load} />
  }

  // `roles.manage` belongs to the locked administrator column only, so it is
  // excluded from what Manager/HR can ever reach.
  const grantableCount = catalog.groups
    .flatMap((group) => group.permissions)
    .filter((entry) => entry.key !== 'roles.manage').length
  const countFor = (role: ConfigurableRoleKey) => `${draft[role].length}/${grantableCount}`

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Decide exactly what each role can do. Changes apply to everyone with that role as soon as they reload the portal."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={!dirty || saving}
              onClick={() => setDraft(saved)}
            >
              <RotateCcwIcon />
              Discard
            </Button>
            <Button disabled={!dirty || saving} onClick={handleSave}>
              <SaveIcon />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        }
      />

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <LockIcon className="size-3.5" aria-hidden />
        Administrators always hold every permission — that column is locked and cannot be narrowed down.
      </p>

      <Card className="mt-4 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Permission</TableHead>
              <TableHead className="w-28 text-center">Administrator</TableHead>
              <TableHead className="w-28 text-center">
                Manager{' '}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{countFor('manager')}</span>
              </TableHead>
              <TableHead className="w-28 pr-4 text-center">
                HR <span className="ml-1 text-xs font-normal text-muted-foreground">{countFor('hr')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalog.groups.map((group) => (
              <Fragment key={group.key}>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={4} className="pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </TableCell>
                </TableRow>
                {group.permissions.map((entry) => (
                  <TableRow key={entry.key}>
                    <TableCell className="pl-4">
                      <div className="grid gap-0.5">
                        <span className="font-medium text-foreground">{entry.label}</span>
                        {entry.hint ? (
                          <span className="text-xs text-muted-foreground">{entry.hint}</span>
                        ) : null}
                        <code className="text-[0.65rem] text-muted-foreground/70">{entry.key}</code>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked
                        disabled
                        aria-label={`${entry.label} — administrator (always on)`}
                        className="size-4 accent-wyndell-orange"
                      />
                    </TableCell>
                    {EDITABLE_ROLES.map((role) => (
                      <TableCell key={role} className={role === 'hr' ? 'pr-4 text-center' : 'text-center'}>
                        <input
                          type="checkbox"
                          checked={draft[role].includes(entry.key)}
                          onChange={() => handleToggle(role, entry.key)}
                          aria-label={`${entry.label} — ${role}`}
                          className="size-4 cursor-pointer accent-wyndell-orange"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">Tip</Badge>
        <span>
          Revoking <code className="text-foreground">reports.view</code> hides both the dashboard summary and the
          Reports page; revoking <code className="text-foreground">users.manage</code> leaves HR with a read-only
          staff directory.
        </span>
      </div>
    </div>
  )
}
