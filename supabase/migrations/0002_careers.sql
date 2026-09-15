-- ============================================================================
-- Wyndell's — careers schema
-- Job postings (restaurant / cafe) managed by staff, plus public applications.
-- The Express API signs in with the service-role key (bypasses RLS); no
-- policies are defined, matching the initial schema convention.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type career_department as enum ('restaurant', 'cafe');

create type posting_status as enum ('open', 'closed');

create type application_status as enum ('new', 'reviewed', 'shortlisted', 'hired', 'rejected');

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table career_postings (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id) on delete cascade,
  title text not null,
  department career_department not null default 'restaurant',
  employment_type text not null default 'Full-time',
  summary text not null default '',
  description text not null default '',
  requirements text not null default '',
  status posting_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger career_postings_updated_at before update on career_postings
  for each row execute function set_updated_at();

create index career_postings_branch_status_idx on career_postings (branch_id, status);

create table job_applications (
  id uuid primary key default gen_random_uuid(),
  posting_id uuid not null references career_postings (id) on delete cascade,
  full_name text not null,
  email text not null,
  contact_number text not null default '',
  cover_letter text not null default '',
  resume_url text not null default '',
  status application_status not null default 'new',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger job_applications_updated_at before update on job_applications
  for each row execute function set_updated_at();

create index job_applications_posting_created_idx on job_applications (posting_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------
-- No policies are defined; the Express API operates through the service-role
-- key, which bypasses RLS (same convention as the initial schema).

alter table career_postings enable row level security;
alter table job_applications enable row level security;