-- ============================================================================
-- Wyndell's — newsletter subscribers
-- Backs the home-page signup section and the timed newsletter popup. Rows are
-- listed and removed from the dashboard's Customers screen.
--
-- The Express API signs in with the service-role key (bypasses RLS); no
-- policies are defined, matching the convention of every earlier migration.
-- ============================================================================

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  name text not null default '' check (char_length(name) <= 120),
  -- Normalised to lowercase by the API before insert; the unique index is what
  -- actually enforces "one signup per address".
  email text not null unique check (char_length(email) <= 254),
  -- Where the signup came from: the home-page section or the timed popup.
  source text not null default 'homepage' check (source in ('homepage', 'popup')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger newsletter_subscribers_updated_at before update on newsletter_subscribers
  for each row execute function set_updated_at();

create index newsletter_subscribers_created_idx on newsletter_subscribers (created_at desc);

comment on table newsletter_subscribers is
  'People who asked to receive Wyndell''s newsletter. Managed from the Customers screen.';

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------
-- No policies are defined; the Express API operates through the service-role
-- key, which bypasses RLS (same convention as the initial schema).

alter table newsletter_subscribers enable row level security;
