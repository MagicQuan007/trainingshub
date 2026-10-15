-- Täglicher Check-in (subjektives Befinden) und Rückgängig-Info für angepasste Einheiten
create table if not exists public.checkins (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date           date not null,
  sleep          smallint not null check (sleep between 1 and 5),     -- 5 = sehr gut
  energy         smallint not null check (energy between 1 and 5),    -- 5 = frisch
  soreness       smallint not null check (soreness between 1 and 5),  -- 5 = kein Muskelkater
  stress         smallint not null check (stress between 1 and 5),    -- 5 = entspannt
  mood           smallint not null check (mood between 1 and 5),      -- 5 = super
  ill            boolean not null default false,
  pain           boolean not null default false,
  minutes_available integer,
  note           text,
  score          smallint,
  recommendation text,
  created_at     timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.checkins enable row level security;

drop policy if exists "checkins_select_own" on public.checkins;
create policy "checkins_select_own" on public.checkins for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "checkins_insert_own" on public.checkins;
create policy "checkins_insert_own" on public.checkins for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "checkins_update_own" on public.checkins;
create policy "checkins_update_own" on public.checkins for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "checkins_delete_own" on public.checkins;
create policy "checkins_delete_own" on public.checkins for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.checkins from anon;
grant select, insert, update, delete on table public.checkins to authenticated;

-- Ursprüngliche Version einer Einheit, wenn sie per Check-in angepasst wurde
alter table public.planned_workouts add column if not exists adjusted_from jsonb;
