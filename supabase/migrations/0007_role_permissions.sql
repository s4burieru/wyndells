-- ============================================================================
-- Wyndell's — per-role permissions
-- Turns access control from a hard-coded role list into a toggleable matrix:
-- every permission a non-admin role holds is stored here and can be changed
-- from the dashboard (Settings → Roles & Permissions).
--
-- The `admin` role is intentionally absent — administrators always hold every
-- permission and that column is locked in the UI.
-- The Express API signs in with the service-role key (bypasses RLS); no
-- policies are defined, matching the convention of every earlier migration.
-- ============================================================================

create table role_permissions (
  role user_role not null,
  permission text not null,
  updated_at timestamptz not null default now(),
  primary key (role, permission),
  constraint role_permissions_role_check check (role in ('manager', 'hr'))
);

create index role_permissions_role_idx on role_permissions (role);

comment on table role_permissions is
  'Granted permissions per non-admin role. Missing rows mean "not granted"; an empty table means "use the built-in defaults".';

-- ----------------------------------------------------------------------------
-- Seed — the shipped defaults, matching DEFAULT_ROLE_PERMISSIONS on the server.
-- ----------------------------------------------------------------------------

insert into role_permissions (role, permission) values
  -- Manager: full day-to-day branch operations (unchanged from before HR existed).
  ('manager', 'reservations.manage'),
  ('manager', 'tables.manage'),
  ('manager', 'menu.manage'),
  ('manager', 'feedback.view'),
  ('manager', 'careers.manage'),
  ('manager', 'reports.view'),
  ('manager', 'chat.use'),
  ('manager', 'directory.view'),
  -- HR: people and hiring — read-only staff records, recruitment, HR reports.
  ('hr', 'users.view'),
  ('hr', 'careers.manage'),
  ('hr', 'careers.delete'),
  ('hr', 'reports.view'),
  ('hr', 'chat.use'),
  ('hr', 'directory.view')
on conflict (role, permission) do nothing;
