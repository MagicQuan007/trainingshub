-- Ernährungsprofil (Größe, Alter, Ziel, Haushalt) – bewusst in der DB, nicht im öffentlichen Repo
alter table public.user_settings add column if not exists nutrition jsonb;

-- Wochen-Essensplan inkl. abgehakter Einkaufsliste
create table if not exists public.meal_plans (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start  date not null,
  plan        jsonb not null,
  checked     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.meal_plans enable row level security;

drop policy if exists "meal_plans_select_own" on public.meal_plans;
create policy "meal_plans_select_own" on public.meal_plans for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "meal_plans_insert_own" on public.meal_plans;
create policy "meal_plans_insert_own" on public.meal_plans for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "meal_plans_update_own" on public.meal_plans;
create policy "meal_plans_update_own" on public.meal_plans for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "meal_plans_delete_own" on public.meal_plans;
create policy "meal_plans_delete_own" on public.meal_plans for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.meal_plans from anon;
grant select, insert, update, delete on table public.meal_plans to authenticated;
