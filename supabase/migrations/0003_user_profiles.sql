-- ============================================================================
-- Wyndell's — staff account profiles
-- Adds the profile details shown on the admin "Users & Managers" page and on
-- each staff member's own profile: job title, contact number, address, avatar
-- photo and a short bio. Every column has a default and uses `if not exists`,
-- so this migration is safe to run against an existing database.
-- The Express API signs in with the service-role key (bypasses RLS); no
-- policies are defined, matching the existing schema convention.
-- ============================================================================

alter table users
  add column if not exists position text not null default '',
  add column if not exists contact_number text not null default '',
  add column if not exists address text not null default '',
  add column if not exists avatar_url text not null default '',
  add column if not exists bio text not null default '';

comment on column users.position is 'Job title / role label shown on the staff profile, e.g. "Branch Manager".';
comment on column users.contact_number is 'Staff contact number (optional, free text).';
comment on column users.address is 'Mailing / home address (optional, free text).';
comment on column users.avatar_url is 'Public http(s) URL of the profile photo (optional).';
comment on column users.bio is 'Short staff bio / notes shown on the profile (optional).';