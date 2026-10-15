# trainingshub

Persönlicher Trainings-Hub: Planung, Ernährung, Race-Planer – via Intervals.icu & Supabase

## Aufbau

| Teil | Wo | Aufgabe |
|---|---|---|
| Web-App | `src/` → GitHub Pages | Oberfläche (Vite + React) |
| Datenbank | `supabase/migrations/` | Tabellen mit Row Level Security |
| Edge Functions | `supabase/functions/` | Alles mit geheimen Schlüsseln (Intervals, Wetter …) |
| Intervals.icu | Cloud | Brücke zu Garmin |

## Sicherheitsregel

Im Repo stehen nur öffentliche Werte (`src/config.ts`: Supabase-URL + Publishable Key).
Alle geheimen Schlüssel liegen als **Supabase Secrets** oder **GitHub Secrets** – nie im Code.

## Secrets

**GitHub → Settings → Secrets and variables → Actions**
- `SUPABASE_ACCESS_TOKEN` – persönliches Token aus supabase.com/dashboard/account/tokens
- `SUPABASE_DB_PASSWORD` – Datenbank-Passwort des Projekts

**Supabase → Edge Functions → Secrets**
- `INTERVALS_API_KEY` – aus Intervals.icu → Settings → Developer Settings

## Deploy

- Push auf `main` mit Änderungen in `src/` → Web-App wird automatisch neu veröffentlicht
- Push auf `main` mit Änderungen in `supabase/` → Migrationen + Functions werden automatisch deployt
- Beide Workflows lassen sich unter *Actions* auch manuell starten

## Lokal entwickeln (optional)

```bash
npm install
npm run dev
```
