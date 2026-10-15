-- Tageswerte aus Intervals.icu (Schlaf, HRV, Ruhepuls, Gewicht, Fitness/Ermüdung)
create table if not exists public.wellness (
  user_id      uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  date         date   not null,
  ctl          double precision,   -- Fitness
  atl          double precision,   -- Ermüdung
  ramp_rate    double precision,
  resting_hr   integer,
  hrv          double precision,
  sleep_secs   integer,
  sleep_score  double precision,
  weight       double precision,
  readiness    double precision,
  raw          jsonb,
  synced_at    timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.wellness enable row level security;

drop policy if exists "wellness_select_own" on public.wellness;
create policy "wellness_select_own" on public.wellness
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "wellness_insert_own" on public.wellness;
create policy "wellness_insert_own" on public.wellness
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "wellness_update_own" on public.wellness;
create policy "wellness_update_own" on public.wellness
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "wellness_delete_own" on public.wellness;
create policy "wellness_delete_own" on public.wellness
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.wellness from anon;
grant select, insert, update, delete on table public.wellness to authenticated;
