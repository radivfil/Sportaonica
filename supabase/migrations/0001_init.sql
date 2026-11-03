-- Sportaonica — Supabase schema
-- Run in the Supabase SQL editor or with `supabase db push`.
-- All access goes through the server using the service-role key; RLS is
-- enabled with no public policies, so the anon key cannot read child data.

create extension if not exists pgcrypto;

create table if not exists site_kv (
  key text primary key,          -- 'settings' | 'content'
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists locations (
  id text primary key,
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
  "order" int not null default 0
);

create table if not exists activities (
  id text primary key,
  slug text unique not null,
  name text not null,
  short_description text not null default '',
  description text not null default '',
  age_min int not null,
  age_max int not null,
  icon text not null default 'universal',
  color text not null default 'teal',
  status text not null default 'active' check (status in ('active','archived')),
  "order" int not null default 0
);

create table if not exists slots (
  id text primary key,
  activity_id text not null references activities(id),
  location_id text not null references locations(id),
  day_of_week int not null check (day_of_week between 1 and 7),
  start_time text not null,
  end_time text not null,
  capacity int not null check (capacity > 0),
  pre_enrolled int not null default 0 check (pre_enrolled >= 0),
  status text not null default 'active' check (status in ('active','archived')),
  note text
);

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  slot_id text not null references slots(id),
  status text not null check (status in ('confirmed','waitlist','cancelled')),
  parent_name text not null,
  phone text not null,
  email text not null,
  child_name text not null,
  child_birth_date date not null,
  health_note text,
  source text,
  gdpr_consent boolean not null,
  marketing_consent boolean not null default false,
  paid boolean not null default false,
  cancel_token text unique not null default translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_'),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index if not exists registrations_slot_status on registrations(slot_id, status, created_at);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  content_html text not null default '',
  cover_image text,
  cover_alt text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table site_kv enable row level security;
alter table locations enable row level security;
alter table activities enable row level security;
alter table slots enable row level security;
alter table registrations enable row level security;
alter table posts enable row level security;
alter table contact_messages enable row level security;

-- ------------------------------------------------------------------
-- Atomic booking: locks the slot row, counts seats, inserts.
-- Concurrent calls for the same slot are serialised by FOR UPDATE,
-- so the last seat can never be sold twice.
-- ------------------------------------------------------------------
create or replace function book_registration(
  p_slot_id text,
  p_payload jsonb,
  p_allow_waitlist boolean,
  p_force boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot slots%rowtype;
  v_taken int;
  v_status text;
  v_row registrations%rowtype;
begin
  select * into v_slot from slots where id = p_slot_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'SLOT_NOT_FOUND');
  end if;
  if v_slot.status <> 'active' and not p_force then
    return jsonb_build_object('ok', false, 'code', 'SLOT_INACTIVE');
  end if;

  select v_slot.pre_enrolled + count(*) into v_taken
    from registrations where slot_id = p_slot_id and status = 'confirmed';

  if v_taken < v_slot.capacity or p_force then
    v_status := 'confirmed';
  elsif p_allow_waitlist then
    v_status := 'waitlist';
  else
    return jsonb_build_object('ok', false, 'code', 'SLOT_FULL');
  end if;

  insert into registrations (
    slot_id, status, parent_name, phone, email, child_name, child_birth_date,
    health_note, source, gdpr_consent, marketing_consent, paid, admin_note
  ) values (
    p_slot_id, v_status,
    p_payload->>'parentName', p_payload->>'phone', p_payload->>'email',
    p_payload->>'childName', (p_payload->>'childBirthDate')::date,
    nullif(p_payload->>'healthNote', ''), nullif(p_payload->>'source', ''),
    coalesce((p_payload->>'gdprConsent')::boolean, false),
    coalesce((p_payload->>'marketingConsent')::boolean, false),
    coalesce((p_payload->>'paid')::boolean, false),
    nullif(p_payload->>'adminNote', '')
  ) returning * into v_row;

  return jsonb_build_object('ok', true, 'registration', to_jsonb(v_row));
end;
$$;

-- Promote the oldest waitlisted registration when a seat is free.
create or replace function promote_waitlist(p_slot_id text) returns registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot slots%rowtype;
  v_taken int;
  v_next registrations%rowtype;
begin
  select * into v_slot from slots where id = p_slot_id for update;
  select v_slot.pre_enrolled + count(*) into v_taken
    from registrations where slot_id = p_slot_id and status = 'confirmed';
  if v_taken >= v_slot.capacity then
    return null;
  end if;
  select * into v_next from registrations
    where slot_id = p_slot_id and status = 'waitlist'
    order by created_at asc
    limit 1
    for update skip locked;
  if not found then
    return null;
  end if;
  update registrations set status = 'confirmed', updated_at = now()
    where id = v_next.id returning * into v_next;
  return v_next;
end;
$$;

create or replace function cancel_registration(p_id uuid default null, p_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row registrations%rowtype;
  v_was_confirmed boolean;
  v_promoted registrations%rowtype;
begin
  select * into v_row from registrations
    where (p_id is not null and id = p_id) or (p_token is not null and cancel_token = p_token)
    for update;
  if not found then
    return jsonb_build_object('cancelled', null, 'promoted', null);
  end if;
  -- lock the slot first to serialise with bookings
  perform 1 from slots where id = v_row.slot_id for update;
  if v_row.status = 'cancelled' then
    return jsonb_build_object('cancelled', to_jsonb(v_row), 'promoted', null, 'alreadyCancelled', true);
  end if;
  v_was_confirmed := v_row.status = 'confirmed';
  update registrations set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where id = v_row.id returning * into v_row;
  if v_was_confirmed then
    v_promoted := promote_waitlist(v_row.slot_id);
  end if;
  return jsonb_build_object(
    'cancelled', to_jsonb(v_row),
    'promoted', case when v_promoted.id is null then null else to_jsonb(v_promoted) end
  );
end;
$$;

create or replace function move_registration(p_id uuid, p_target_slot text, p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row registrations%rowtype;
  v_target slots%rowtype;
  v_taken int;
  v_from text;
  v_was_confirmed boolean;
  v_promoted registrations%rowtype;
begin
  select * into v_row from registrations where id = p_id for update;
  select * into v_target from slots where id = p_target_slot for update;
  if v_row.id is null or v_target.id is null then
    return jsonb_build_object('ok', false, 'code', 'SLOT_NOT_FOUND');
  end if;
  select v_target.pre_enrolled + count(*) into v_taken
    from registrations where slot_id = p_target_slot and status = 'confirmed';
  if v_taken >= v_target.capacity and not p_force then
    return jsonb_build_object('ok', false, 'code', 'SLOT_FULL');
  end if;
  v_from := v_row.slot_id;
  v_was_confirmed := v_row.status = 'confirmed';
  update registrations set slot_id = p_target_slot, status = 'confirmed', updated_at = now()
    where id = p_id returning * into v_row;
  if v_was_confirmed then
    v_promoted := promote_waitlist(v_from);
  end if;
  return jsonb_build_object('ok', true, 'registration', to_jsonb(v_row),
    'promoted', case when v_promoted.id is null then null else to_jsonb(v_promoted) end);
end;
$$;

create or replace function delete_registration(p_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row registrations%rowtype;
begin
  delete from registrations where id = p_id returning * into v_row;
  if v_row.status = 'confirmed' then
    perform promote_waitlist(v_row.slot_id);
  end if;
end;
$$;

revoke all on function book_registration(text, jsonb, boolean, boolean) from public, anon, authenticated;
revoke all on function promote_waitlist(text) from public, anon, authenticated;
revoke all on function cancel_registration(uuid, text) from public, anon, authenticated;
revoke all on function move_registration(uuid, text, boolean) from public, anon, authenticated;
revoke all on function delete_registration(uuid) from public, anon, authenticated;
