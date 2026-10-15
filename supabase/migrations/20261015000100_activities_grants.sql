-- Neue Supabase-Projekte vergeben keine Tabellenrechte mehr automatisch.
-- Eingeloggte Nutzer dürfen auf die Tabelle zugreifen; welche Zeilen sie sehen,
-- regelt weiterhin Row Level Security (nur eigene Zeilen).
grant select, insert, update, delete on table public.activities to authenticated;
