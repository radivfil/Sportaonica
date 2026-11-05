-- =====================================================================
-- Sportaonica — schema
-- Applied with `supabase db push` (or scripts/db-migrate.mjs). Idempotent
-- where practical. Region: EU (Frankfurt). See docs/backup-restore.md.
-- =====================================================================

-- ---------- admins (owner accounts; rows reference Supabase Auth users) ----------
create table if not exists public.admins (
  user_id uuid primary key,
  email text not null,
  created_at timestamptz not null default now()
);

-- ---------- editable site settings & content blocks ----------
create table if not exists public.site_kv (
  key text primary key check (key in ('settings', 'content')),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.locations (
  id text primary key default gen_random_uuid()::text,
  slug text unique not null,
  name text not null,
  venue text not null default '',
  address text not null default '',
  postal_code text not null default '',
  city text not null default '',
  lat double precision not null default 0,
  lng double precision not null default 0,
  map_url text not null default '',
  description text not null default '',
  hours text not null default '',
  sort_order int not null default 0
);

create table if not exists public.activities (
  id text primary key default gen_random_uuid()::text,
  slug text unique not null,
  name text not null check (length(name) between 2 and 120),
  audience text not null default 'kids' check (audience in ('kids', 'adults')),
  short_description text not null default '',
  description text not null default '',
  age_min int not null check (age_min between 0 and 99),
  age_max int check (age_max is null or age_max between 0 and 99),
  with_parent boolean not null default false,
  key_facts text[] not null default '{}',
  icon text not null default 'universal',
  color text not null default 'teal' check (color in ('pink', 'teal', 'butter', 'sky')),
  status text not null default 'active' check (status in ('active', 'archived')),
  sort_order int not null default 0,
  constraint activities_age_range check (age_max is null or age_max >= age_min)
);

create table if not exists public.slots (
  id text primary key default gen_random_uuid()::text,
  activity_id text not null references public.activities(id) on update cascade,
  location_id text not null references public.locations(id) on update cascade,
  kind text not null default 'weekly' check (kind in ('weekly', 'single')),
  day_of_week int not null check (day_of_week between 1 and 7),
  session_date date,
  valid_from date,
  valid_to date,
  series_id text,
  start_time time not null,
  end_time time not null,
  capacity int not null check (capacity between 1 and 500),
  status text not null default 'active' check (status in ('active', 'archived')),
  note text,
  constraint slots_time_order check (end_time > start_time),
  constraint slots_single_has_date check (kind = 'weekly' or session_date is not null),
  constraint slots_valid_range check (valid_from is null or valid_to is null or valid_to >= valid_from)
);
create index if not exists slots_activity on public.slots(activity_id);
create index if not exists slots_series on public.slots(series_id) where series_id is not null;

-- ---------- registrations (personal data — admin only, see RLS) ----------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  slot_id text not null references public.slots(id) on update cascade,
  group_id uuid not null,
  status text not null check (status in ('active', 'waitlist', 'cancelled_parent', 'cancelled_admin')),
  parent_name text not null check (length(parent_name) <= 120),
  phone text not null check (length(phone) <= 30),
  email text not null check (length(email) <= 160),
  child_name text not null check (length(child_name) <= 120),
  child_birth_date date,
  health_note text check (health_note is null or length(health_note) <= 600),
  gdpr_consent boolean not null,
  paid boolean not null default false,
  cancel_token_hash text not null check (cancel_token_hash ~ '^[0-9a-f]{64}$'),
  admin_note text check (admin_note is null or length(admin_note) <= 2000),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  cancelled_at timestamptz,
  promoted_at timestamptz,
  anonymized_at timestamptz
);
create index if not exists registrations_slot_status on public.registrations(slot_id, status, created_at);
create index if not exists registrations_token on public.registrations(cancel_token_hash);
create index if not exists registrations_group on public.registrations(group_id);
-- one open registration per child per slot (duplicate protection at DB level)
create unique index if not exists registrations_no_duplicate
  on public.registrations(slot_id, lower(btrim(child_name)), child_birth_date)
  where status in ('active', 'waitlist') and anonymized_at is null;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  content_html text not null default '',
  cover_image text,
  cover_alt text,
  images jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  src text not null,
  alt text not null check (length(btrim(alt)) >= 3),
  category text not null default 'treninzi' check (category in ('treninzi', 'rodendani', 'radionice', 'odrasli', 'dogadanja')),
  width int not null default 1200,
  height int not null default 900,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('contact', 'birthday')),
  name text not null check (length(name) <= 120),
  email text not null check (length(email) <= 160),
  phone text check (phone is null or length(phone) <= 30),
  message text not null default '' check (length(message) <= 3000),
  event_date date,
  children_count int check (children_count is null or children_count between 1 and 100),
  child_age int check (child_age is null or child_age between 0 and 18),
  handled boolean not null default false,
  created_at timestamptz not null default now(),
  anonymized_at timestamptz
);

-- append-only audit trail
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default clock_timestamp(),
  actor text not null,
  action text not null,
  entity_id text,
  details text
);
create index if not exists audit_log_at on public.audit_log(at desc);

-- transactional e-mail outbox (written in the same transaction as the change)
create table if not exists public.outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('confirmation', 'cancellation', 'promoted', 'owner_new_registration', 'owner_new_inquiry', 'owner_email_quota')),
  ref_id text not null,
  attempts int not null default 0,
  next_attempt_at timestamptz not null default clock_timestamp(),
  last_error text,
  created_at timestamptz not null default clock_timestamp(),
  sent_at timestamptz
);
create index if not exists outbox_pending on public.outbox(next_attempt_at) where sent_at is null;

create table if not exists public.email_usage (
  day date primary key,
  sent int not null default 0,
  warned boolean not null default false
);

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits int not null
);
