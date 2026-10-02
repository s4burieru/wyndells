import type { UserRole } from './index'

/**
 * Every capability the portal knows about. A role holds a permission only when
 * it appears in `role_permissions` (admins always hold all of them), so this
 * list is both the validation whitelist for that table and the catalog the
 * dashboard's Roles & Permissions screen renders.
 *
 * Keep in sync with the `Permission` union in `client/src/types/index.ts`.
 */
export const PERMISSIONS = [
  'roles.manage',
  'branches.manage',
  'users.view',
  'users.manage',
  'activity.view',
  'reservations.manage',
  'tables.manage',
  'menu.manage',
  'feedback.view',
  'feedback.delete',
  'careers.manage',
  'careers.delete',
  'reports.view',
  'reports.branch_performance',
  'chat.use',
  'directory.view',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value)
}

/** Roles an administrator can re-grant permissions to from the dashboard. */
export const CONFIGURABLE_ROLES = ['manager', 'hr'] as const
export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number]

export function isConfigurableRole(value: unknown): value is ConfigurableRole {
  return value === 'manager' || value === 'hr'
}

/** A single row of the Roles & Permissions matrix. */
export type PermissionEntry = { key: Permission; label: string; hint?: string }

/** Grouping shown on the Roles & Permissions screen. */
export type PermissionGroup = { key: string; label: string; permissions: PermissionEntry[] }

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'people',
    label: 'People & access',
    permissions: [
      { key: 'roles.manage', label: 'Roles & permissions', hint: 'Change what each role can do.' },
      { key: 'users.view', label: 'View staff accounts', hint: 'Read the Users & Managers directory.' },
      {
        key: 'users.manage',
        label: 'Manage staff accounts',
        hint: 'Create, edit, deactivate and delete accounts.',
      },
      { key: 'activity.view', label: 'View activity log', hint: 'See the admin audit trail.' },
      { key: 'directory.view', label: 'View staff directory', hint: 'Browse staff profiles.' },
    ],
  },
  {
    key: 'operations',
    label: 'Branch operations',
    permissions: [
      { key: 'branches.manage', label: 'Manage branches', hint: 'Create, edit and deactivate branches.' },
      {
        key: 'reservations.manage',
        label: 'Manage reservations',
        hint: 'Book, confirm and cancel reservations.',
      },
      { key: 'tables.manage', label: 'Manage tables', hint: 'Add tables and change their status.' },
      { key: 'menu.manage', label: 'Manage menu', hint: 'Add, edit and remove menu items.' },
      { key: 'feedback.view', label: 'View feedback', hint: 'Read customer feedback.' },
      { key: 'feedback.delete', label: 'Delete feedback', hint: 'Remove feedback from the manage screen.' },
    ],
  },
  {
    key: 'hiring',
    label: 'Recruitment',
    permissions: [
      {
        key: 'careers.manage',
        label: 'Manage postings & applications',
        hint: 'Post jobs and move candidates through the pipeline.',
      },
      {
        key: 'careers.delete',
        label: 'Delete postings & applications',
        hint: 'Permanently remove postings and applications.',
      },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    permissions: [
      { key: 'reports.view', label: 'View reports', hint: 'Open the Reports page.' },
      {
        key: 'reports.branch_performance',
        label: 'Branch performance',
        hint: 'See the all-branches comparison card.',
      },
    ],
  },
  {
    key: 'collaboration',
    label: 'Collaboration',
    permissions: [{ key: 'chat.use', label: 'Use staff chat', hint: 'Send and receive staff messages.' }],
  },
]

/**
 * The permissions each configurable role starts with. Seeded into
 * `role_permissions` by migration 0007 and used as a fallback whenever that
 * table is missing or has not been seeded yet, so an un-migrated database can
 * never lock anybody out.
 *
 * Keep in sync with the seed block in `supabase/migrations/0007_role_permissions.sql`.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<ConfigurableRole, readonly Permission[]> = {
  // Managers keep the full day-to-day branch toolkit they have always had.
  manager: [
    'reservations.manage',
    'tables.manage',
    'menu.manage',
    'feedback.view',
    'careers.manage',
    'reports.view',
    'chat.use',
    'directory.view',
  ],
  // HR spans every branch: read-only staff records, recruitment, reports.
  hr: ['users.view', 'careers.manage', 'careers.delete', 'reports.view', 'chat.use', 'directory.view'],
}

/** Built-in permissions for a role, used when nothing has been granted yet. */
export function defaultPermissionsFor(role: UserRole): readonly Permission[] {
  if (role === 'admin') {
    return PERMISSIONS
  }
  return DEFAULT_ROLE_PERMISSIONS[role] ?? []
}
