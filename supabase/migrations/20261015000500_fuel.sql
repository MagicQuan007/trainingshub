-- Verpflegungsschrank: Produkte und Erfahrungen (Verträglichkeit)
create table if not exists public.fuel_products (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  barcode       text,
  name          text not null,
  brand         text,
  kind          text not null default 'gel',   -- gel, drink, bar, chew, electrolyte, food, other
  serving_label text,                          -- z. B. "1 Gel (40 g)"
  serving_g     double precision,
  carbs_g       double precision,              -- pro Portion
  sodium_mg     double precision,              -- pro Portion
  caffeine_mg   double precision,              -- pro Portion
  kcal          double precision,              -- pro Portion
  carb_ratio    text,                          -- z. B. "1:0,8" (Glukose:Fruktose)
  stock         integer not null default 0,
  tolerance     text,                          -- gut, mittel, schlecht (Gesamteindruck)
  notes         text,
  image_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists fuel_products_user_idx on public.fuel_products (user_id, kind);

create table if not exists public.fuel_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id  uuid not null references public.fuel_products (id) on delete cascade,
  date        date not null default current_date,
  context     text not null default 'training',  -- training, rennen
  amount      double precision not null default 1, -- Portionen
  tolerance   text not null default 'gut',       -- gut, mittel, schlecht
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists fuel_logs_product_idx on public.fuel_logs (product_id, date desc);

-- RLS
alter table public.fuel_products enable row level security;
alter table public.fuel_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fuel_products', 'fuel_logs'] loop
    execute format('drop policy if exists "%1$s_select_own" on public.%1$s', t);
    execute format('create policy "%1$s_select_own" on public.%1$s for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s', t);
    execute format('create policy "%1$s_insert_own" on public.%1$s for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$s', t);
    execute format('create policy "%1$s_update_own" on public.%1$s for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$s', t);
    execute format('create policy "%1$s_delete_own" on public.%1$s for delete to authenticated using (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%1$s from anon', t);
    execute format('grant select, insert, update, delete on table public.%1$s to authenticated', t);
  end loop;
end $$;
