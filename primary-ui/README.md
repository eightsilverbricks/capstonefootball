# Primary UI

The main user interface for The Clark Index. React + TypeScript + Vite.

It contains the prediction cards, the weekly games slate, game reports, model
performance and methodology content, real Supabase-backed accounts, and picks.

## Run

```sh
npm install
npm run dev
```

Vite serves the app at `http://localhost:8080/` — the port is pinned in
`vite.config.ts`, not left at the Vite default. To use another port:

```sh
npm run dev -- --port 8081
```

## Environment

Create `.env.local` in this directory:

```sh
# Accounts and picks. Both values are public by design: the anon key ships in
# the client bundle and is protected by row level security, not secrecy.
# Never put the service_role key here.
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Optional. Leave unset to read the static public/predictions.json.
# VITE_API_BASE_URL=http://127.0.0.1:8000
```

**If the Supabase variables are missing the app does not error** — it falls
back to `src/auth/localAuthClient.ts`, a device-local fake profile. That is
convenient for UI work but means sign-up appears to succeed while writing
nothing to the database, so check these first when accounts behave oddly.
The schema those tables come from is `supabase/schema.sql` at the repo root.

## Data and demo mode

Two datasets ship as static JSON, both written by
`nfl-prediction/src/export_predictions.py` and committed:

| File | Season | Why |
|---|---|---|
| `public/predictions.json` | 2026 (live) | The season being played. No outcomes until games are played. |
| `public/predictions-2024.json` | 2024 (demo) | A completed season, so picks resolve and records work. |

Which one loads is decided by `src/lib/season.ts` and the toggle on `/settings`,
persisted to localStorage per device. Picks are keyed by nflverse `game_id`
(`2026_01_NE_SEA`), which is season-scoped, so demo picks can never reach a live
record — every season surface joins picks against the loaded dataset.

No backend is needed for frontend work. Set `VITE_API_BASE_URL` to read from a
live FastAPI backend instead, which takes the season as a query parameter
(`/predictions?season=2026`). There is no dev proxy.

## Tests

```sh
npm test
npm run test:coverage
```

Vitest blanks the Supabase env vars (see `vite.config.ts`) so the suite always
exercises the deterministic local fallback and never touches the network.
