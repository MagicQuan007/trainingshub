-- =====================================================================
-- 1) Private Trainingsdaten absichern: nur der Owner (Merlin) hat Zugriff.
--    Nötig, weil für den Crew-Kalender Registrierungen geöffnet werden.
-- =====================================================================
create or replace function public.is_owner() returns boolean
language sql stable
as $$ select auth.uid() = 'd3cb85e2-30e3-415d-9b7e-f03d49b53d78'::uuid $$;

do $$
declare
  t text;
  pol record;
begin
  foreach t in array array['activities','planned_workouts','wellness','user_settings','fuel_products','fuel_logs','checkins','meal_plans'] loop
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('create policy "%1$s_owner_select" on public.%1$s for select to authenticated using (user_id = (select auth.uid()) and public.is_owner())', t);
    execute format('create policy "%1$s_owner_insert" on public.%1$s for insert to authenticated with check (user_id = (select auth.uid()) and public.is_owner())', t);
    execute format('create policy "%1$s_owner_update" on public.%1$s for update to authenticated using (user_id = (select auth.uid()) and public.is_owner()) with check (user_id = (select auth.uid()) and public.is_owner())', t);
    execute format('create policy "%1$s_owner_delete" on public.%1$s for delete to authenticated using (user_id = (select auth.uid()) and public.is_owner())', t);
  end loop;
end $$;

-- =====================================================================
-- 2) Crew-Kalender
-- =====================================================================
create table if not exists public.crew_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  status     text not null default 'pending' check (status in ('pending','approved','admin','blocked')),
  created_at timestamptz not null default now()
);

create table if not exists public.crew_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text not null default 'race' check (kind in ('race','group','other')),
  wish        boolean not null default false,          -- Wunschliste (noch nicht fest)
  date        date,                                    -- bei Wunschliste optional
  start_time  time,
  location    text,
  distances   text[] not null default '{}',
  url         text,
  notes       text,
  created_by  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint date_required_unless_wish check (wish or date is not null)
);
create index if not exists crew_events_date_idx on public.crew_events (date);

create table if not exists public.crew_rsvps (
  event_id   uuid not null references public.crew_events (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status     text not null check (status in ('going','maybe','interested')),
  distance   text,
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- Freigeschaltetes Mitglied? (security definer verhindert RLS-Rekursion)
create or replace function public.is_crew() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.crew_members where user_id = auth.uid() and status in ('approved','admin')) $$;

-- Neue Registrierungen landen automatisch als "pending"
create or replace function public.handle_new_crew_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.crew_members (user_id, name, status)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)), 'pending')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created_crew on auth.users;
create trigger on_auth_user_created_crew after insert on auth.users
  for each row execute function public.handle_new_crew_user();

-- Owner ist Admin
insert into public.crew_members (user_id, name, status)
select id, 'Merlin', 'admin' from auth.users where id = 'd3cb85e2-30e3-415d-9b7e-f03d49b53d78'::uuid
on conflict (user_id) do update set status = 'admin';

-- Freischalten / Sperren nur durch Owner
create or replace function public.set_member_status(target uuid, new_status text) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_owner() then raise exception 'not allowed'; end if;
  if new_status not in ('pending','approved','admin','blocked') then raise exception 'invalid status'; end if;
  update public.crew_members set status = new_status where user_id = target;
end $$;

-- RLS
alter table public.crew_members enable row level security;
alter table public.crew_events enable row level security;
alter table public.crew_rsvps enable row level security;

drop policy if exists "crew_members_select" on public.crew_members;
create policy "crew_members_select" on public.crew_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_crew());
drop policy if exists "crew_members_update_own_name" on public.crew_members;
create policy "crew_members_update_own_name" on public.crew_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "crew_events_select" on public.crew_events;
create policy "crew_events_select" on public.crew_events for select to authenticated using (public.is_crew());
drop policy if exists "crew_events_insert" on public.crew_events;
create policy "crew_events_insert" on public.crew_events for insert to authenticated
  with check (public.is_crew() and created_by = (select auth.uid()));
drop policy if exists "crew_events_update" on public.crew_events;
create policy "crew_events_update" on public.crew_events for update to authenticated
  using (public.is_crew() and (created_by = (select auth.uid()) or public.is_owner()))
  with check (public.is_crew());
drop policy if exists "crew_events_delete" on public.crew_events;
create policy "crew_events_delete" on public.crew_events for delete to authenticated
  using (public.is_crew() and (created_by = (select auth.uid()) or public.is_owner()));

drop policy if exists "crew_rsvps_select" on public.crew_rsvps;
create policy "crew_rsvps_select" on public.crew_rsvps for select to authenticated using (public.is_crew());
drop policy if exists "crew_rsvps_insert" on public.crew_rsvps;
create policy "crew_rsvps_insert" on public.crew_rsvps for insert to authenticated
  with check (public.is_crew() and user_id = (select auth.uid()));
drop policy if exists "crew_rsvps_update" on public.crew_rsvps;
create policy "crew_rsvps_update" on public.crew_rsvps for update to authenticated
  using (user_id = (select auth.uid())) with check (public.is_crew() and user_id = (select auth.uid()));
drop policy if exists "crew_rsvps_delete" on public.crew_rsvps;
create policy "crew_rsvps_delete" on public.crew_rsvps for delete to authenticated using (user_id = (select auth.uid()));

-- Rechte
revoke all on public.crew_members, public.crew_events, public.crew_rsvps from anon;
revoke all on public.crew_members from authenticated;
grant select on public.crew_members to authenticated;
grant update (name) on public.crew_members to authenticated;
grant select, insert, update, delete on public.crew_events, public.crew_rsvps to authenticated;
revoke all on function public.set_member_status(uuid, text) from anon, public;
grant execute on function public.set_member_status(uuid, text) to authenticated;
