-- =====================================================================
-- Sportaonica — business logic in the database
-- Every function that touches personal data is SECURITY DEFINER with a
-- fixed search_path and checks the caller explicitly. Execute rights are
-- granted per function at the bottom of 20261105000300_rls.sql.
-- =====================================================================

-- ---------- helpers ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  -- an admin must be listed in public.admins AND have passed 2FA (aal2)
  select exists (select 1 from public.admins where user_id = auth.uid())
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function public.current_actor() returns text
language sql stable as $$
  select coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    case coalesce(auth.jwt() ->> 'role', '')
      when 'service_role' then 'sustav'
      when 'anon' then 'javno (roditelj)'
      else 'nepoznato'
    end);
$$;

create or replace function public.zagreb_today() returns date
language sql stable as $$ select (now() at time zone 'Europe/Zagreb')::date $$;

create or replace function public.age_years(p_birth date, p_ref date) returns int
language sql immutable as $$ select extract(year from age(p_ref, p_birth))::int $$;

create or replace function public.slot_is_past(s public.slots) returns boolean
language sql stable as $$
  select case when s.kind = 'single' then s.session_date < public.zagreb_today()
              else s.valid_to is not null and s.valid_to < public.zagreb_today() end;
$$;

create or replace function public.slot_starts_at(s public.slots) returns timestamptz
language sql stable as $$
  select case when s.kind = 'single' then (s.session_date + s.start_time) at time zone 'Europe/Zagreb' end;
$$;

create or replace function public.app_setting_int(p_key text, p_default int) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select (value ->> p_key)::int from public.site_kv where key = 'settings'), p_default);
$$;

create or replace function public.write_audit(p_action text, p_entity_id text, p_details text) returns void
language sql security definer set search_path = public as $$
  insert into public.audit_log(actor, action, entity_id, details)
  values (public.current_actor(), p_action, p_entity_id, left(p_details, 500));
$$;

-- ---------- waitlist ----------
-- Promote waitlisted registrations (FIFO) while the slot has free seats.
-- Caller must already hold the slot row lock (all callers below do).
create or replace function public._promote_waitlist(p_slot_id text) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_slot public.slots%rowtype;
  v_taken int;
  v_next uuid;
  v_count int := 0;
begin
  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found then return 0; end if;
  loop
    select count(*) into v_taken from public.registrations where slot_id = p_slot_id and status = 'active';
    exit when v_taken >= v_slot.capacity;
    select id into v_next from public.registrations
      where slot_id = p_slot_id and status = 'waitlist'
      order by created_at, id limit 1 for update;
    exit when v_next is null;
    update public.registrations set status = 'active', promoted_at = now(), updated_at = now() where id = v_next;
    insert into public.outbox(kind, ref_id) values ('promoted', v_next::text);
    v_count := v_count + 1;
    v_next := null;
  end loop;
  return v_count;
end;
$$;

-- ---------- public: availability (no personal data) ----------
create or replace function public.list_slots(p_include_archived boolean default false)
returns table (
  id text, activity_id text, location_id text, kind text, day_of_week int,
  session_date date, valid_from date, valid_to date, series_id text,
  start_time text, end_time text, capacity int, status text, note text,
  active_count int, waitlist_count int, is_past boolean
)
language sql stable security definer set search_path = public as $$
  select s.id, s.activity_id, s.location_id, s.kind, s.day_of_week,
         s.session_date, s.valid_from, s.valid_to, s.series_id,
         to_char(s.start_time, 'HH24:MI'), to_char(s.end_time, 'HH24:MI'),
         s.capacity, s.status, s.note,
         (select count(*) from public.registrations r where r.slot_id = s.id and r.status = 'active')::int,
         (select count(*) from public.registrations r where r.slot_id = s.id and r.status = 'waitlist')::int,
         public.slot_is_past(s)
    from public.slots s
    join public.activities a on a.id = s.activity_id
   where (p_include_archived and (public.is_admin() or coalesce(auth.jwt() ->> 'role', '') = 'service_role'))
      or (s.status = 'active' and a.status = 'active')
   order by s.session_date nulls first, s.day_of_week, s.start_time;
$$;

-- ---------- public: atomic booking ----------
-- Locks every requested slot row (stable order → no deadlocks), validates
-- age, duplicates and capacity for ALL slots, then inserts. Either every
-- requested session is booked/waitlisted or nothing is.
create or replace function public.book_registration(
  p_slot_ids text[],
  p_payload jsonb,
  p_token_hash text,
  p_allow_waitlist boolean default false,
  p_options jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_force boolean := coalesce((p_options ->> 'force')::boolean, false);
  v_ignore_age boolean := coalesce((p_options ->> 'ignoreAge')::boolean, false);
  v_admin_note text := nullif(btrim(coalesce(p_options ->> 'adminNote', '')), '');
  v_paid boolean := coalesce((p_options ->> 'paid')::boolean, false);
  v_group uuid := gen_random_uuid();
  v_ids text[];
  v_slot public.slots%rowtype;
  v_act public.activities%rowtype;
  v_birth date;
  v_age int;
  v_taken int;
  v_status text;
  v_id uuid;
  v_out jsonb := '[]'::jsonb;
  v_name text := btrim(coalesce(p_payload ->> 'childName', ''));
begin
  if (v_force or v_ignore_age or v_admin_note is not null or v_paid) and not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select array_agg(distinct x order by x) into v_ids from unnest(p_slot_ids) x;
  if v_ids is null or cardinality(v_ids) = 0 or cardinality(v_ids) > 60 then
    return jsonb_build_object('ok', false, 'code', 'SLOT_NOT_FOUND');
  end if;

  -- defence in depth: the server validates with zod first
  if length(btrim(coalesce(p_payload ->> 'parentName', ''))) not between 3 and 120
     or length(v_name) not between 2 and 120
     or coalesce(p_payload ->> 'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or length(p_payload ->> 'email') > 160
     or length(regexp_replace(coalesce(p_payload ->> 'phone', ''), '\D', '', 'g')) not between 6 and 20
     or coalesce((p_payload ->> 'gdprConsent')::boolean, false) is not true
     or length(coalesce(p_payload ->> 'healthNote', '')) > 600
     or coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID');
  end if;
  begin
    v_birth := (p_payload ->> 'childBirthDate')::date;
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'INVALID');
  end;
  if v_birth is null or v_birth > public.zagreb_today() or v_birth < date '1900-01-01' then
    return jsonb_build_object('ok', false, 'code', 'INVALID');
  end if;

  -- 1) lock all slots in id order
  perform 1 from public.slots where id = any(v_ids) order by id for update;
  if (select count(*) from public.slots where id = any(v_ids)) <> cardinality(v_ids) then
    return jsonb_build_object('ok', false, 'code', 'SLOT_NOT_FOUND');
  end if;

  -- 2) validate every slot
  for v_slot in select * from public.slots where id = any(v_ids) order by id loop
    select * into v_act from public.activities where id = v_slot.activity_id;
    if (v_slot.status <> 'active' or v_act.status <> 'active' or public.slot_is_past(v_slot)) and not v_force then
      return jsonb_build_object('ok', false, 'code', 'SLOT_INACTIVE', 'slotId', v_slot.id);
    end if;
    if not v_ignore_age then
      v_age := public.age_years(v_birth, public.zagreb_today());
      if v_age < v_act.age_min or (v_act.age_max is not null and v_age > v_act.age_max) then
        return jsonb_build_object('ok', false, 'code', 'AGE_OUT_OF_RANGE', 'slotId', v_slot.id);
      end if;
    end if;
    if exists (
      select 1 from public.registrations r
       where r.slot_id = v_slot.id and r.status in ('active', 'waitlist') and r.anonymized_at is null
         and lower(btrim(r.child_name)) = lower(v_name) and r.child_birth_date = v_birth
    ) then
      return jsonb_build_object('ok', false, 'code', 'DUPLICATE', 'slotId', v_slot.id);
    end if;
    select count(*) into v_taken from public.registrations where slot_id = v_slot.id and status = 'active';
    if v_taken >= v_slot.capacity and not v_force and not p_allow_waitlist then
      return jsonb_build_object('ok', false, 'code', 'SLOT_FULL', 'slotId', v_slot.id);
    end if;
  end loop;

  -- 3) insert
  for v_slot in select * from public.slots where id = any(v_ids) order by session_date nulls first, id loop
    select count(*) into v_taken from public.registrations where slot_id = v_slot.id and status = 'active';
    v_status := case when v_taken < v_slot.capacity or v_force then 'active' else 'waitlist' end;
    insert into public.registrations (
      slot_id, group_id, status, parent_name, phone, email, child_name, child_birth_date,
      health_note, gdpr_consent, paid, cancel_token_hash, admin_note
    ) values (
      v_slot.id, v_group, v_status,
      btrim(p_payload ->> 'parentName'), btrim(p_payload ->> 'phone'), lower(btrim(p_payload ->> 'email')),
      v_name, v_birth, nullif(btrim(coalesce(p_payload ->> 'healthNote', '')), ''),
      true, v_paid, p_token_hash, v_admin_note
    ) returning id into v_id;
    v_out := v_out || jsonb_build_object(
      'id', v_id, 'slotId', v_slot.id, 'status', v_status,
      'waitlistPosition', case when v_status = 'waitlist'
        then (select count(*) from public.registrations where slot_id = v_slot.id and status = 'waitlist') end);
  end loop;

  insert into public.outbox(kind, ref_id) values ('confirmation', v_group::text), ('owner_new_registration', v_group::text);
  return jsonb_build_object('ok', true, 'groupId', v_group, 'registrations', v_out);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE');
end;
$$;

-- ---------- public: parent's view & cancellation via secret link ----------
create or replace function public.registrations_by_token(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_hash text;
begin
  if p_token is null or length(p_token) not between 20 and 200 then return '[]'::jsonb; end if;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id, 'slotId', r.slot_id, 'status', r.status, 'childName', r.child_name,
             'groupId', r.group_id, 'cancelledAt', r.cancelled_at,
             'cancellable', r.status in ('active', 'waitlist') and (
               s.kind = 'weekly' or public.slot_starts_at(s) - make_interval(hours => public.app_setting_int('cancelDeadlineHours', 24)) > now()))
           order by s.session_date nulls first, s.day_of_week, s.start_time)
      from public.registrations r join public.slots s on s.id = r.slot_id
     where r.cancel_token_hash = v_hash and r.anonymized_at is null), '[]'::jsonb);
end;
$$;

create or replace function public.cancel_by_token(p_token text, p_ids uuid[] default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_hash text;
  v_deadline int := public.app_setting_int('cancelDeadlineHours', 24);
  v_row public.registrations%rowtype;
  v_slot public.slots%rowtype;
  v_cancelled jsonb := '[]'::jsonb;
  v_late jsonb := '[]'::jsonb;
  v_group uuid;
  v_promoted int := 0;
begin
  if p_token is null or length(p_token) not between 20 and 200 then
    return jsonb_build_object('ok', false, 'cancelled', '[]'::jsonb, 'tooLate', '[]'::jsonb, 'promoted', 0);
  end if;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  -- lock slots first (same order as booking) to serialise with bookings
  perform 1 from public.slots
    where id in (select slot_id from public.registrations where cancel_token_hash = v_hash)
    order by id for update;

  for v_row in
    select * from public.registrations
     where cancel_token_hash = v_hash and status in ('active', 'waitlist') and anonymized_at is null
       and (p_ids is null or id = any(p_ids))
     order by id for update
  loop
    select * into v_slot from public.slots where id = v_row.slot_id;
    if v_slot.kind = 'single' and public.slot_starts_at(v_slot) - make_interval(hours => v_deadline) <= now() then
      v_late := v_late || to_jsonb(v_row.id);
      continue;
    end if;
    update public.registrations set status = 'cancelled_parent', cancelled_at = now(), updated_at = now() where id = v_row.id;
    v_cancelled := v_cancelled || to_jsonb(v_row.id);
    v_group := v_row.group_id;
    if v_row.status = 'active' then
      v_promoted := v_promoted + public._promote_waitlist(v_row.slot_id);
    end if;
  end loop;

  if v_group is not null then
    insert into public.outbox(kind, ref_id) values ('cancellation', v_group::text);
  end if;
  return jsonb_build_object('ok', true, 'cancelled', v_cancelled, 'tooLate', v_late, 'promoted', v_promoted);
end;
$$;

-- ---------- admin ----------
create or replace function public.admin_cancel_registration(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row public.registrations%rowtype;
  v_promoted int := 0;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_row from public.registrations where id = p_id;
  if not found then return jsonb_build_object('ok', false); end if;
  perform 1 from public.slots where id = v_row.slot_id for update;
  select * into v_row from public.registrations where id = p_id for update;
  if v_row.status not in ('active', 'waitlist') then return jsonb_build_object('ok', true, 'promoted', 0); end if;
  update public.registrations set status = 'cancelled_admin', cancelled_at = now(), updated_at = now() where id = p_id;
  if v_row.status = 'active' then v_promoted := public._promote_waitlist(v_row.slot_id); end if;
  return jsonb_build_object('ok', true, 'promoted', v_promoted);
end;
$$;

create or replace function public.admin_move_registration(p_id uuid, p_target text, p_force boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row public.registrations%rowtype;
  v_target public.slots%rowtype;
  v_taken int;
  v_promoted int := 0;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_row from public.registrations where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'SLOT_NOT_FOUND'); end if;
  if v_row.slot_id = p_target then return jsonb_build_object('ok', true, 'promoted', 0); end if;
  perform 1 from public.slots where id in (v_row.slot_id, p_target) order by id for update;
  select * into v_target from public.slots where id = p_target;
  if not found then return jsonb_build_object('ok', false, 'code', 'SLOT_NOT_FOUND'); end if;
  select * into v_row from public.registrations where id = p_id for update;
  if v_row.status not in ('active', 'waitlist') then return jsonb_build_object('ok', false, 'code', 'SLOT_INACTIVE'); end if;
  if exists (select 1 from public.registrations r where r.slot_id = p_target and r.status in ('active', 'waitlist')
              and r.anonymized_at is null and lower(btrim(r.child_name)) = lower(btrim(v_row.child_name))
              and r.child_birth_date = v_row.child_birth_date) then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE');
  end if;
  select count(*) into v_taken from public.registrations where slot_id = p_target and status = 'active';
  if v_taken >= v_target.capacity and not p_force then
    return jsonb_build_object('ok', false, 'code', 'SLOT_FULL');
  end if;
  update public.registrations set slot_id = p_target, status = 'active', updated_at = now() where id = p_id;
  if v_row.status = 'active' then v_promoted := public._promote_waitlist(v_row.slot_id); end if;
  return jsonb_build_object('ok', true, 'promoted', v_promoted);
end;
$$;

create or replace function public.admin_promote_registration(p_id uuid, p_force boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row public.registrations%rowtype;
  v_slot public.slots%rowtype;
  v_taken int;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_row from public.registrations where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'SLOT_NOT_FOUND'); end if;
  select * into v_slot from public.slots where id = v_row.slot_id for update;
  select * into v_row from public.registrations where id = p_id for update;
  if v_row.status <> 'waitlist' then return jsonb_build_object('ok', true); end if;
  select count(*) into v_taken from public.registrations where slot_id = v_slot.id and status = 'active';
  if v_taken >= v_slot.capacity and not p_force then return jsonb_build_object('ok', false, 'code', 'SLOT_FULL'); end if;
  update public.registrations set status = 'active', promoted_at = now(), updated_at = now() where id = p_id;
  insert into public.outbox(kind, ref_id) values ('promoted', p_id::text);
  return jsonb_build_object('ok', true);
end;
$$;

-- GDPR erasure: personal data is wiped, the row stays for statistics / history.
create or replace function public.anonymize_registration(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row public.registrations%rowtype;
begin
  if not (public.is_admin() or coalesce(auth.jwt() ->> 'role', '') = 'service_role') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_row from public.registrations where id = p_id;
  if not found then return jsonb_build_object('ok', false); end if;
  if v_row.status in ('active', 'waitlist') then
    perform 1 from public.slots where id = v_row.slot_id for update;
    update public.registrations set status = 'cancelled_admin', cancelled_at = now() where id = p_id;
    if v_row.status = 'active' then perform public._promote_waitlist(v_row.slot_id); end if;
  end if;
  update public.registrations set
    parent_name = 'Obrisano', phone = '-', email = 'obrisano@invalid', child_name = 'Obrisano',
    child_birth_date = null, health_note = null, admin_note = null,
    cancel_token_hash = repeat('0', 64), anonymized_at = now(), updated_at = now()
   where id = p_id;
  delete from public.outbox where ref_id in (p_id::text, v_row.group_id::text) and sent_at is null;
  return jsonb_build_object('ok', true);
end;
$$;

-- Retention: anonymise registrations that ended / were cancelled more than N months ago.
create or replace function public.purge_expired_registrations() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_months int := public.app_setting_int('retentionMonths', 24);
  v_cutoff date := public.zagreb_today() - make_interval(months => v_months);
  v_id uuid;
  v_count int := 0;
begin
  if not (public.is_admin() or coalesce(auth.jwt() ->> 'role', '') = 'service_role') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  for v_id in
    select r.id from public.registrations r join public.slots s on s.id = r.slot_id
     where r.anonymized_at is null and (
       (r.status in ('cancelled_parent', 'cancelled_admin') and r.cancelled_at < v_cutoff)
       or (s.kind = 'single' and s.session_date < v_cutoff)
       or (s.kind = 'weekly' and s.valid_to is not null and s.valid_to < v_cutoff))
  loop
    perform public.anonymize_registration(v_id);
    v_count := v_count + 1;
  end loop;
  update public.inquiries set name = 'Obrisano', email = 'obrisano@invalid', phone = null, message = '', anonymized_at = now()
   where anonymized_at is null and created_at < v_cutoff;
  if v_count > 0 then perform public.write_audit('registration.anonymize', null, 'Automatsko brisanje: ' || v_count); end if;
  return v_count;
end;
$$;

create or replace function public.log_audit(p_action text, p_entity_id text default null, p_details text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  perform public.write_audit(p_action, p_entity_id, p_details);
end;
$$;

-- ---------- public: inquiries (contact form, birthday request) ----------
create or replace function public.create_inquiry(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_type text := coalesce(p_payload ->> 'type', 'contact');
begin
  if v_type not in ('contact', 'birthday')
     or length(btrim(coalesce(p_payload ->> 'name', ''))) not between 2 and 120
     or coalesce(p_payload ->> 'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or length(coalesce(p_payload ->> 'message', '')) > 3000 then
    return jsonb_build_object('ok', false, 'code', 'INVALID');
  end if;
  insert into public.inquiries(type, name, email, phone, message, event_date, children_count, child_age)
  values (v_type, btrim(p_payload ->> 'name'), lower(btrim(p_payload ->> 'email')),
          nullif(btrim(coalesce(p_payload ->> 'phone', '')), ''), coalesce(p_payload ->> 'message', ''),
          nullif(p_payload ->> 'eventDate', '')::date,
          nullif(p_payload ->> 'childrenCount', '')::int,
          nullif(p_payload ->> 'childAge', '')::int)
  returning id into v_id;
  insert into public.outbox(kind, ref_id) values ('owner_new_inquiry', v_id::text);
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- ---------- public: rate limiting shared by all server instances ----------
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_hits int;
begin
  if p_key is null or length(p_key) > 200 or p_limit < 1 or p_window_seconds not between 1 and 86400 then
    return false;
  end if;
  insert into public.rate_limits as rl (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.hits + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning hits into v_hits;
  if random() < 0.01 then delete from public.rate_limits where window_start < now() - interval '1 day'; end if;
  return v_hits <= p_limit;
end;
$$;

create or replace function public.health_check() returns int
language sql stable as $$ select 1 $$;

-- ---------- system (service role): e-mail outbox & daily quota ----------
create or replace function public.claim_outbox(p_limit int default 20) returns setof public.outbox
language plpgsql security definer set search_path = public as $$
begin
  -- exponential back-off: 1, 4, 9, 16 … minutes (max 6 h); give up after 8 attempts
  return query
  update public.outbox o
     set attempts = o.attempts + 1,
         next_attempt_at = now() + make_interval(secs => least((o.attempts + 1) * (o.attempts + 1) * 60, 21600))
   where o.id in (
     select id from public.outbox
      where sent_at is null and attempts < 8 and next_attempt_at <= now()
      order by created_at limit p_limit for update skip locked)
  returning o.*;
end;
$$;

-- p_retry_at: defer without spending an attempt (daily e-mail quota reached)
create or replace function public.finish_outbox(p_id uuid, p_error text default null, p_retry_at timestamptz default null) returns void
language sql security definer set search_path = public as $$
  update public.outbox
     set sent_at = case when p_error is null then now() end,
         last_error = left(p_error, 500),
         attempts = case when p_retry_at is not null then greatest(attempts - 1, 0) else attempts end,
         next_attempt_at = coalesce(p_retry_at, next_attempt_at)
   where id = p_id;
$$;

-- Atomically reserve one e-mail from today's quota. warn=true exactly once per day when warn_at is reached.
create or replace function public.take_email_quota(p_limit int, p_warn_at int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_day date := public.zagreb_today();
  v_row public.email_usage%rowtype;
  v_warn boolean := false;
begin
  insert into public.email_usage(day) values (v_day) on conflict do nothing;
  select * into v_row from public.email_usage where day = v_day for update;
  if v_row.sent >= p_limit then
    return jsonb_build_object('allowed', false, 'sent', v_row.sent, 'warn', false);
  end if;
  if v_row.sent + 1 >= p_warn_at and not v_row.warned then
    v_warn := true;
  end if;
  update public.email_usage set sent = sent + 1, warned = warned or v_warn where day = v_day;
  return jsonb_build_object('allowed', true, 'sent', v_row.sent + 1, 'warn', v_warn);
end;
$$;

create or replace function public.rotate_group_token(p_group uuid, p_hash text) returns void
language sql security definer set search_path = public as $$
  update public.registrations set cancel_token_hash = p_hash where group_id = p_group and anonymized_at is null;
$$;

-- ---------- triggers ----------
create or replace function public.tg_registrations_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_action text;
  v_fields text[] := '{}';
begin
  if tg_op = 'INSERT' then
    perform public.write_audit('registration.create', new.id::text, 'status=' || new.status || ' slot=' || new.slot_id);
    return new;
  end if;
  new.updated_at := now();
  if new.anonymized_at is not null and old.anonymized_at is null then
    v_action := 'registration.anonymize';
  elsif new.status <> old.status and new.status like 'cancelled%' then
    v_action := 'registration.cancel';
  elsif new.slot_id <> old.slot_id then
    v_action := 'registration.move';
  elsif old.status = 'waitlist' and new.status = 'active' then
    v_action := 'registration.promote';
  else
    v_action := 'registration.update';
  end if;
  -- log field NAMES only, never values (no personal data in the audit trail)
  if new.parent_name is distinct from old.parent_name then v_fields := array_append(v_fields, 'roditelj'::text); end if;
  if new.email is distinct from old.email then v_fields := array_append(v_fields, 'email'::text); end if;
  if new.phone is distinct from old.phone then v_fields := array_append(v_fields, 'telefon'::text); end if;
  if new.child_name is distinct from old.child_name then v_fields := array_append(v_fields, 'dijete'::text); end if;
  if new.child_birth_date is distinct from old.child_birth_date then v_fields := array_append(v_fields, 'datum_rodenja'::text); end if;
  if new.health_note is distinct from old.health_note then v_fields := array_append(v_fields, 'zdravlje'::text); end if;
  if new.paid is distinct from old.paid then v_fields := array_append(v_fields, ('placeno=' || new.paid)::text); end if;
  if new.admin_note is distinct from old.admin_note then v_fields := array_append(v_fields, 'biljeska'::text); end if;
  if new.status is distinct from old.status then v_fields := array_append(v_fields, (old.status || '→' || new.status)::text); end if;
  if new.slot_id is distinct from old.slot_id then v_fields := array_append(v_fields, (old.slot_id || '→' || new.slot_id)::text); end if;
  if v_action <> 'registration.update' or cardinality(v_fields) > 0 then
    perform public.write_audit(v_action, new.id::text, array_to_string(v_fields, ', '));
  end if;
  return new;
end;
$$;

drop trigger if exists registrations_audit_ins on public.registrations;
create trigger registrations_audit_ins after insert on public.registrations
  for each row execute function public.tg_registrations_audit();
drop trigger if exists registrations_audit_upd on public.registrations;
create trigger registrations_audit_upd before update on public.registrations
  for each row execute function public.tg_registrations_audit();

-- more capacity → move waitlisted children in automatically
create or replace function public.tg_slots_capacity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.capacity > old.capacity or (new.status = 'active' and old.status <> 'active') then
    perform public._promote_waitlist(new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists slots_capacity on public.slots;
create trigger slots_capacity after update of capacity, status on public.slots
  for each row execute function public.tg_slots_capacity();

-- capacity can't drop below the number of active registrations
create or replace function public.tg_slots_capacity_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_taken int;
begin
  select count(*) into v_taken from public.registrations where slot_id = new.id and status = 'active';
  if new.capacity < v_taken then
    raise exception 'Kapacitet (%) ne može biti manji od broja upisanih (%).', new.capacity, v_taken using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists slots_capacity_guard on public.slots;
create trigger slots_capacity_guard before update of capacity on public.slots
  for each row execute function public.tg_slots_capacity_guard();

-- slots with registrations can only be archived, never deleted
create or replace function public.tg_slots_no_delete() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.registrations where slot_id = old.id) then
    raise exception 'Termin ima prijave — arhivirajte ga umjesto brisanja.' using errcode = '23503';
  end if;
  return old;
end;
$$;
drop trigger if exists slots_no_delete on public.slots;
create trigger slots_no_delete before delete on public.slots
  for each row execute function public.tg_slots_no_delete();
