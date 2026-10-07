-- ============================================================================
-- Wyndell's — marketing permissions (promotions + customers)
-- Migration 0007 stores grants as rows, so new permissions added later never
-- reach an already-seeded database through `DEFAULT_ROLE_PERMISSIONS` alone.
-- This backfills the shipped default for `promotions.manage` (managers can
-- manage the promotions of their own branch — restaurant-wide rows still
-- require an administrator, enforced in the service layer).
--
-- `customers.view` / `customers.delete` are intentionally not granted here:
-- the newsletter subscriber list ships administrator-only and can be opened up
-- per role from Settings → Roles & Permissions.
--
-- The Express API signs in with the service-role key (bypasses RLS); no
-- policies are defined, matching the convention of every earlier migration.
-- ============================================================================

insert into role_permissions (role, permission) values
  ('manager', 'promotions.manage')
on conflict (role, permission) do nothing;

comment on column role_permissions.permission is
  'Granted capability. Catalog: PERMISSIONS in server/src/constants/permissions.ts.';
