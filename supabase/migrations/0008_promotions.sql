-- ============================================================================
-- Wyndell's — promotions, events & announcements
-- Drives the "Promotions & announcements" section on the public home page.
-- Staff (administrators, and managers for their own branch) manage the rows
-- from Promotions in the dashboard; the public API only ever returns rows that
-- are published and inside their visibility window.
--
-- The Express API signs in with the service-role key (bypasses RLS); no
-- policies are defined, matching the convention of every earlier migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type promotion_kind as enum ('promotion', 'event', 'announcement');

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table promotions (
  id uuid primary key default gen_random_uuid(),
  -- null = restaurant-wide (shown for every branch).
  branch_id uuid references branches (id) on delete set null,
  kind promotion_kind not null default 'promotion',
  title text not null check (char_length(title) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 500),
  image text not null default '',
  -- Stored as YYYY-MM-DD text so the public window filter stays timezone-safe
  -- and string-comparable (mirrors the reservations date convention).
  event_date text not null check (event_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  -- Optional visibility window; either end may be left open.
  starts_on text check (starts_on is null or starts_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  expires_on text check (expires_on is null or expires_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_window_check check (starts_on is null or expires_on is null or starts_on <= expires_on)
);

create trigger promotions_updated_at before update on promotions
  for each row execute function set_updated_at();

create index promotions_published_event_date_idx on promotions (is_published, event_date desc);
create index promotions_branch_idx on promotions (branch_id);

comment on table promotions is
  'Public promotions, events and announcements shown on the home page. `branch_id` null means restaurant-wide.';

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------
-- No policies are defined; the Express API operates through the service-role
-- key, which bypasses RLS (same convention as the initial schema).

alter table promotions enable row level security;
