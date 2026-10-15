-- Persönliche Einstellungen (z. B. Trainingszonen des Coaches) – bewusst nicht im öffentlichen Repo
create table if not exists public.user_settings (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  coach       jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "settings_select_own" on public.user_settings;
create policy "settings_select_own" on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "settings_insert_own" on public.user_settings;
create policy "settings_insert_own" on public.user_settings
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "settings_update_own" on public.user_settings;
create policy "settings_update_own" on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.user_settings from anon;
grant select, insert, update on table public.user_settings to authenticated;
