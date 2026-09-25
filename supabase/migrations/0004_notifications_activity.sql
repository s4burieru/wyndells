-- ============================================================================
-- Wyndell's — notifications & activity log
-- In-app notifications for staff (bell in the dashboard header) plus an
-- admin-only audit trail of who did what across the system.
-- The Express API signs in with the service-role key (bypasses RLS); no
-- policies are defined, matching the convention of every earlier migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type notification_type as enum (
  'reservation_new',
  'reservation_status',
  'table_assigned',
  'feedback_new',
  'application_new',
  'application_status',
  'staff_created',
  'welcome'
);

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  -- Null for account-level notices (e.g. a welcome message).
  branch_id uuid references branches (id) on delete set null,
  type notification_type not null,
  title text not null,
  body text not null default '',
  -- Dashboard route to open when the notification is clicked, e.g.
  -- '/staff/reservations?ref=RD-4821'. Empty when there is nothing to open.
  link text not null default '',
  -- Null means unread; set when the recipient acknowledges it.
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on notifications (user_id, created_at desc);
create index notifications_user_unread_idx on notifications (user_id) where read_at is null;

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  -- Null when the actor is not a staff account (public reservation, job
  -- application, feedback submission).
  actor_id uuid references users (id) on delete set null,
  branch_id uuid references branches (id) on delete set null,
  -- Stable machine name, e.g. 'reservation.status_changed'.
  action text not null,
  -- Human-readable one-liner shown in the admin Activity table.
  summary text not null,
  entity text not null default '',
  entity_id text not null default '',
  created_at timestamptz not null default now()
);

create index activity_log_created_idx on activity_log (created_at desc);
create index activity_log_actor_idx on activity_log (actor_id, created_at desc);
create index activity_log_branch_idx on activity_log (branch_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------
-- No policies: the Express API uses the service-role key, which bypasses RLS
-- (same convention as 0001 / 0002 / 0003).

alter table notifications enable row level security;
alter table activity_log enable row level security;
