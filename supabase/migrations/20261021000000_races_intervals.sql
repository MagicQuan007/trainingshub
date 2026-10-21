-- Rennen werden als RACE_A/B/C-Events in den Intervals-Kalender gespiegelt
alter table public.races add column if not exists intervals_event_id text;
alter table public.races add column if not exists synced_at timestamptz;
