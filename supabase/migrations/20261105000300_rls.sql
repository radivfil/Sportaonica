-- =====================================================================
-- Sportaonica — Row Level Security & privileges
--
-- Roles (Supabase):
--   anon           public website (server uses the anon key)
--   authenticated  logged-in users; only rows in public.admins with aal2 (2FA) are admins
--   service_role   server-only jobs (e-mail outbox, retention). Never shipped to the browser.
--
-- Rule of thumb: anon may READ public catalogue data and EXECUTE a handful of
-- RPCs. Personal data (registrations, inquiries, audit, outbox) is readable by
-- the admin only. tests/db/*.test.ts prove this against a real Postgres.
-- =====================================================================

alter table public.admins          enable row level security;
alter table public.site_kv         enable row level security;
alter table public.locations       enable row level security;
alter table public.activities      enable row level security;
alter table public.slots           enable row level security;
alter table public.registrations   enable row level security;
alter table public.posts           enable row level security;
alter table public.gallery_images  enable row level security;
alter table public.inquiries       enable row level security;
alter table public.audit_log       enable row level security;
alter table public.outbox          enable row level security;
alter table public.email_usage     enable row level security;
alter table public.rate_limits     enable row level security;

-- force RLS even for the table owner (defence in depth for future SECURITY INVOKER code)
alter table public.registrations force row level security;
alter table public.inquiries     force row level security;

-- ---------- table privileges (RLS still applies on top) ----------
revoke all on all tables in schema public from anon, authenticated;
grant select on public.site_kv, public.locations, public.activities, public.slots, public.posts, public.gallery_images to anon, authenticated;
grant insert, update, delete on public.site_kv, public.locations, public.activities, public.slots, public.posts, public.gallery_images to authenticated;
grant select on public.registrations, public.inquiries, public.audit_log, public.outbox, public.email_usage to authenticated;
-- registrations: admin may edit contact data, notes and "paid" directly; status changes go through RPCs
grant update (parent_name, phone, email, child_name, child_birth_date, health_note, paid, admin_note) on public.registrations to authenticated;
grant update (handled) on public.inquiries to authenticated;
-- NO insert/delete on registrations, inquiries, audit_log for anyone but SECURITY DEFINER functions.

-- ---------- policies ----------
drop policy if exists "public read" on public.site_kv;
create policy "public read" on public.site_kv for select to anon, authenticated using (true);
drop policy if exists "admin write" on public.site_kv;
create policy "admin write" on public.site_kv for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.locations;
create policy "public read" on public.locations for select to anon, authenticated using (true);
drop policy if exists "admin write" on public.locations;
create policy "admin write" on public.locations for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read active" on public.activities;
create policy "public read active" on public.activities for select to anon, authenticated using (status = 'active' or public.is_admin());
drop policy if exists "admin write" on public.activities;
create policy "admin write" on public.activities for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read active" on public.slots;
create policy "public read active" on public.slots for select to anon, authenticated using (status = 'active' or public.is_admin());
drop policy if exists "admin write" on public.slots;
create policy "admin write" on public.slots for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read published" on public.posts;
create policy "public read published" on public.posts for select to anon, authenticated using (status = 'published' or public.is_admin());
drop policy if exists "admin write" on public.posts;
create policy "admin write" on public.posts for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.gallery_images;
create policy "public read" on public.gallery_images for select to anon, authenticated using (true);
drop policy if exists "admin write" on public.gallery_images;
create policy "admin write" on public.gallery_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- personal data: admin only
drop policy if exists "admin read" on public.registrations;
create policy "admin read" on public.registrations for select to authenticated using (public.is_admin());
drop policy if exists "admin update" on public.registrations;
create policy "admin update" on public.registrations for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin read" on public.inquiries;
create policy "admin read" on public.inquiries for select to authenticated using (public.is_admin());
drop policy if exists "admin update" on public.inquiries;
create policy "admin update" on public.inquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin read" on public.audit_log;
create policy "admin read" on public.audit_log for select to authenticated using (public.is_admin());
drop policy if exists "admin read" on public.outbox;
create policy "admin read" on public.outbox for select to authenticated using (public.is_admin());
drop policy if exists "admin read" on public.email_usage;
create policy "admin read" on public.email_usage for select to authenticated using (public.is_admin());
-- admins, rate_limits: no policies → only SECURITY DEFINER functions / service_role

-- ---------- function privileges ----------
-- Supabase grants EXECUTE on new functions to anon/authenticated by default,
-- so revoke everything and grant explicitly. Re-run this block in any future
-- migration that adds functions.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.list_slots(boolean) to anon, authenticated;
grant execute on function public.book_registration(text[], jsonb, text, boolean, jsonb) to anon, authenticated;
grant execute on function public.registrations_by_token(text) to anon, authenticated;
grant execute on function public.cancel_by_token(text, uuid[]) to anon, authenticated;
grant execute on function public.create_inquiry(jsonb) to anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to anon, authenticated;
grant execute on function public.health_check() to anon, authenticated;
-- helpers used inside RLS policies / views
grant execute on function public.zagreb_today() to anon, authenticated;
grant execute on function public.slot_is_past(public.slots) to anon, authenticated;
grant execute on function public.slot_starts_at(public.slots) to anon, authenticated;
grant execute on function public.age_years(date, date) to anon, authenticated;
-- admin (each function also checks is_admin() itself)
grant execute on function public.admin_cancel_registration(uuid) to authenticated;
grant execute on function public.admin_move_registration(uuid, text, boolean) to authenticated;
grant execute on function public.admin_promote_registration(uuid, boolean) to authenticated;
grant execute on function public.anonymize_registration(uuid) to authenticated;
grant execute on function public.purge_expired_registrations() to authenticated;
grant execute on function public.log_audit(text, text, text) to authenticated;
-- claim_outbox, finish_outbox, take_email_quota, rotate_group_token, _promote_waitlist,
-- write_audit, current_actor, app_setting_int: service_role / internal only.
grant execute on all functions in schema public to service_role;

-- ---------- Storage (Supabase only): public images, admin uploads ----------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('uploads', 'uploads', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

    execute 'drop policy if exists "uploads public read" on storage.objects';
    execute 'create policy "uploads public read" on storage.objects for select to anon, authenticated using (bucket_id = ''uploads'')';
    execute 'drop policy if exists "uploads admin write" on storage.objects';
    execute 'create policy "uploads admin write" on storage.objects for insert to authenticated with check (bucket_id = ''uploads'' and public.is_admin())';
    execute 'drop policy if exists "uploads admin delete" on storage.objects';
    execute 'create policy "uploads admin delete" on storage.objects for delete to authenticated using (bucket_id = ''uploads'' and public.is_admin())';
  end if;
end $$;
