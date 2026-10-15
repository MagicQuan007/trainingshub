-- Geplante Einheiten. Quelle der Wahrheit ist diese Tabelle;
-- die Edge Function intervals-plan spiegelt sie in den Intervals-Kalender (→ Garmin).
create table if not exists public.planned_workouts (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  date                date        not null,
  sport               text        not null default 'Run',   -- Intervals-Typ: Run, Ride, WeightTraining …
  name                text        not null,
  structure           jsonb,                                 -- Baukasten-Zustand (null = Freitext)
  description         text,                                  -- Workout-Text in Intervals-Syntax
  notes               text,                                  -- eigene Notizen, gehen nicht an die Uhr
  planned_distance_m  double precision,
  planned_duration_s  integer,
  intervals_event_id  text,
  synced_at           timestamptz,
  sync_error          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists planned_workouts_user_date_idx
  on public.planned_workouts (user_id, date);

alter table public.planned_workouts enable row level security;

drop policy if exists "planned_select_own" on public.planned_workouts;
create policy "planned_select_own" on public.planned_workouts
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "planned_insert_own" on public.planned_workouts;
create policy "planned_insert_own" on public.planned_workouts
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "planned_update_own" on public.planned_workouts;
create policy "planned_update_own" on public.planned_workouts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "planned_delete_own" on public.planned_workouts;
create policy "planned_delete_own" on public.planned_workouts
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.planned_workouts from anon;
grant select, insert, update, delete on table public.planned_workouts to authenticated;
