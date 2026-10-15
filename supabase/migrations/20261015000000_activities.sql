-- Aktivitäten aus Intervals.icu (Quelle: Garmin)
create table if not exists public.activities (
  id              text        not null,           -- Intervals-Activity-ID, z. B. "i12345678"
  user_id         uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  start_date      timestamptz not null,
  start_date_local timestamp,
  type            text,                           -- Run, TrailRun, Ride, WeightTraining …
  name            text,
  distance_m      double precision,
  moving_time_s   integer,
  elapsed_time_s  integer,
  elevation_gain_m double precision,
  avg_hr          integer,
  max_hr          integer,
  training_load   integer,                        -- icu_training_load
  avg_speed_ms    double precision,
  raw             jsonb,
  synced_at       timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists activities_user_start_idx
  on public.activities (user_id, start_date desc);

-- Row Level Security: jeder sieht und ändert nur seine eigenen Zeilen
alter table public.activities enable row level security;

drop policy if exists "activities_select_own" on public.activities;
create policy "activities_select_own" on public.activities
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "activities_insert_own" on public.activities;
create policy "activities_insert_own" on public.activities
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "activities_update_own" on public.activities;
create policy "activities_update_own" on public.activities
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "activities_delete_own" on public.activities;
create policy "activities_delete_own" on public.activities
  for delete to authenticated using (user_id = (select auth.uid()));

-- Anonyme Nutzer bekommen gar keinen Zugriff
revoke all on public.activities from anon;
