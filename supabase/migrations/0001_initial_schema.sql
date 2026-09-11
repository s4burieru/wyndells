-- ============================================================================
-- Wyndell's — initial schema (PostgreSQL / Supabase)
-- Replaces the previous MongoDB/Mongoose data layer. The Express API signs in
-- with the service-role key (which bypasses RLS); no policies are defined, so
-- anon/authenticated access is denied by default.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type user_role as enum ('admin', 'manager');

create type reservation_status as enum (
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
  'no-show'
);

create type table_status as enum ('available', 'reserved', 'occupied', 'cleaning', 'unavailable');

create type menu_category as enum ('Appetizers', 'Main Courses', 'Rice Meals', 'Drinks', 'Desserts', 'Others');

create type menu_item_status as enum ('available', 'unavailable');

-- ----------------------------------------------------------------------------
-- updated_at trigger (shared)
-- ----------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address text not null default '',
  city text not null default '',
  contact_number text not null default '',
  email text not null default '',
  hours text not null default '',
  description text not null default '',
  image text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger branches_updated_at before update on branches
  for each row execute function set_updated_at();

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role user_role not null default 'manager',
  assigned_branch_id uuid references branches (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_updated_at before update on users
  for each row execute function set_updated_at();

create index users_assigned_branch_idx on users (assigned_branch_id);

create table dining_tables (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id) on delete cascade,
  table_number text not null,
  capacity integer not null check (capacity between 1 and 50),
  location text not null default 'Main Hall',
  status table_status not null default 'available',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, table_number)
);

create trigger dining_tables_updated_at before update on dining_tables
  for each row execute function set_updated_at();

create index dining_tables_branch_idx on dining_tables (branch_id);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  category menu_category not null,
  image text not null default '',
  status menu_item_status not null default 'available',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger menu_items_updated_at before update on menu_items
  for each row execute function set_updated_at();

create index menu_items_branch_category_idx on menu_items (branch_id, category);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  branch_id uuid not null references branches (id) on delete cascade,
  table_id uuid references dining_tables (id) on delete set null,
  customer_name text not null,
  email text not null,
  contact_number text not null,
  -- Stored as YYYY-MM-DD / HH:MM text so availability logic stays timezone-safe
  -- and string-comparable (mirrors the previous Mongo schema).
  date text not null check (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  guests integer not null check (guests between 1 and 50),
  special_requests text not null default '',
  status reservation_status not null default 'pending',
  status_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reservations_updated_at before update on reservations
  for each row execute function set_updated_at();

create index reservations_branch_date_time_idx on reservations (branch_id, date, time);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id) on delete cascade,
  customer_name text not null,
  contact_number text not null default '',
  email text not null default '',
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) <= 1000),
  reservation_reference text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger feedback_updated_at before update on feedback
  for each row execute function set_updated_at();

create index feedback_branch_created_idx on feedback (branch_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------
-- No policies are defined: the Express API operates through the service-role
-- key, which bypasses RLS. Add policies if you ever expose tables to anon /
-- authenticated roles (e.g. via Supabase Auth or the JS client).

alter table branches enable row level security;
alter table users enable row level security;
alter table dining_tables enable row level security;
alter table menu_items enable row level security;
alter table reservations enable row level security;
alter table feedback enable row level security;

-- ----------------------------------------------------------------------------
-- Report functions (called via rpc() by the dashboard)
-- ----------------------------------------------------------------------------
-- `p_branch` is null for the admin "all branches" view and a uuid for managers.

create or replace function reservation_status_counts(p_branch uuid)
returns table (status reservation_status, count bigint)
language sql security definer as $$
  select status, count(*)::bigint as count
  from reservations
  where p_branch is null or branch_id = p_branch
  group by status;
$$;

create or replace function table_status_counts(p_branch uuid)
returns table (status table_status, count bigint)
language sql security definer as $$
  select status, count(*)::bigint as count
  from dining_tables
  where p_branch is null or branch_id = p_branch
  group by status;
$$;

create or replace function feedback_summary(p_branch uuid)
returns table (total_count bigint, average_rating numeric)
language sql security definer as $$
  select count(*)::bigint as total_count, avg(rating)::numeric as average_rating
  from feedback
  where p_branch is null or branch_id = p_branch;
$$;

create or replace function reservation_trend(p_branch uuid, from_date text, to_date text)
returns table (date text, total_count bigint, confirmed_count bigint, completed_count bigint)
language sql security definer as $$
  select
    date,
    count(*)::bigint as total_count,
    (count(*) filter (where status = 'confirmed'))::bigint as confirmed_count,
    (count(*) filter (where status = 'completed'))::bigint as completed_count
  from reservations
  where (p_branch is null or branch_id = p_branch)
    and date >= from_date
    and date <= to_date
  group by date
  order by date;
$$;

create or replace function branch_performance()
returns table (
  branch_id uuid,
  branch_name text,
  branch_code text,
  branch_city text,
  reservations bigint,
  pending bigint,
  confirmed bigint,
  completed bigint,
  cancelled bigint,
  rejected bigint,
  no_show bigint,
  feedback_count bigint,
  average_rating numeric
)
language sql security definer as $$
  select
    b.id as branch_id,
    b.name as branch_name,
    b.code as branch_code,
    b.city as branch_city,
    coalesce(rs.reservations, 0) as reservations,
    coalesce(rs.pending, 0) as pending,
    coalesce(rs.confirmed, 0) as confirmed,
    coalesce(rs.completed, 0) as completed,
    coalesce(rs.cancelled, 0) as cancelled,
    coalesce(rs.rejected, 0) as rejected,
    coalesce(rs.no_show, 0) as no_show,
    coalesce(fs.feedback_count, 0) as feedback_count,
    fs.average_rating as average_rating
  from branches b
  left join (
    select
      branch_id,
      count(*) as reservations,
      (count(*) filter (where status = 'pending')) as pending,
      (count(*) filter (where status = 'confirmed')) as confirmed,
      (count(*) filter (where status = 'completed')) as completed,
      (count(*) filter (where status = 'cancelled')) as cancelled,
      (count(*) filter (where status = 'rejected')) as rejected,
      (count(*) filter (where status = 'no-show')) as no_show
    from reservations
    group by branch_id
  ) rs on rs.branch_id = b.id
  left join (
    select branch_id, count(*) as feedback_count, avg(rating) as average_rating
    from feedback
    group by branch_id
  ) fs on fs.branch_id = b.id
  order by reservations desc;
$$;
