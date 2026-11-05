-- Minimal emulation of the Supabase environment on a plain Postgres, so the
-- real migrations (supabase/migrations) can be tested in CI without the full
-- Supabase stack. Mirrors: roles anon/authenticated/service_role, auth.uid(),
-- auth.jwt(), auth.role() reading the `request.jwt.claims` GUC exactly like
-- PostgREST does.

do $$
declare r text;
begin
  -- roles are cluster-wide; parallel test databases may race to create them
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    begin
      if not exists (select 1 from pg_roles where rolname = r) then
        execute format('create role %I nologin noinherit %s', r, case when r = 'service_role' then 'bypassrls' else '' end);
      end if;
    exception when duplicate_object or unique_violation then null;
    end;
  end loop;
end $$;

grant anon, authenticated, service_role to current_user;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select auth.jwt() ->> 'role'
$$;
grant execute on all functions in schema auth to anon, authenticated, service_role;

-- Supabase's default privileges (so RLS — not missing grants — is what we test)
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
