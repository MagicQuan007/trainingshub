-- Race-Planer: Rennen mit Profil (aus GPX) und Planungs-Einstellungen
create table if not exists public.races (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key         text,                       -- z. B. "hermann", "rennsteig" für vorbefüllte Rennen
  name        text not null,
  date        date not null,
  start_time  time,
  distance_km double precision not null,
  gain_m      double precision,
  loss_m      double precision,
  lat         double precision,
  lon         double precision,
  profile     jsonb,                      -- {step, points:[elevation...]} aus GPX
  settings    jsonb not null default '{}'::jsonb,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, key)
);

alter table public.races enable row level security;

drop policy if exists "races_owner_select" on public.races;
create policy "races_owner_select" on public.races for select to authenticated using (user_id = (select auth.uid()) and public.is_owner());
drop policy if exists "races_owner_insert" on public.races;
create policy "races_owner_insert" on public.races for insert to authenticated with check (user_id = (select auth.uid()) and public.is_owner());
drop policy if exists "races_owner_update" on public.races;
create policy "races_owner_update" on public.races for update to authenticated using (user_id = (select auth.uid()) and public.is_owner()) with check (user_id = (select auth.uid()) and public.is_owner());
drop policy if exists "races_owner_delete" on public.races;
create policy "races_owner_delete" on public.races for delete to authenticated using (user_id = (select auth.uid()) and public.is_owner());

revoke all on public.races from anon;
grant select, insert, update, delete on table public.races to authenticated;
