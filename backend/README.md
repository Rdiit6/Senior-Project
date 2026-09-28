# MindMeter — Backend

Azure-hosted REST API, rule-based AI logic, and database layer for MindMeter.
Node.js + Express + PostgreSQL. The frontend only ever talks to this API, never to the database.

## Folder structure

| Path | Purpose |
|------|---------|
| `src/server.js` | Entry point: loads config, opens the DB pool, starts Express |
| `src/app.js` | Builds the Express app (security headers, CORS, JSON, routes, errors) |
| `src/api/` | Route handlers for the 5 contract endpoints + request validation |
| `src/logic/` | Pure rules, no database: crisis keyword check, rule-based trend (Stage 1 AI), WIB dates |
| `src/services/` | Orchestration: check-in flow, insights, crisis keyword cache, OpenRouter NLP (Stage 2) |
| `src/models/` | All SQL lives here. `schema.sql` is the PostgreSQL schema (see `docs/image/ERD.png`) |
| `src/middleware/` | Anonymous-token identification and the shared error format |
| `src/config/`, `src/db/` | Environment settings and the PostgreSQL connection pool |
| `scripts/` | `migrate.js` (create tables), `seed-demo.js` (demo account with 4 weeks of history) |
| `tests/` | Unit tests (no database) and integration tests (real PostgreSQL) |

## Endpoints (frozen contract — change only by team agreement)

The exact types live in [`shared/contract.ts`](../shared/contract.ts), the single source of truth for the frontend.
The integration tests type-check every real API response against that file, so if the backend and the
contract drift apart, CI fails. Changing an endpoint = one PR that changes `contract.ts`, the backend and its tests.

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/checkins` | `{ mood_value 1-5, note_text?, client_ts? }` | `{ id, saved, insight?, crisis_flag }` |
| POST | `/api/checkins/sync` | `[{ mood_value, note_text?, client_ts }]` (max 50) | `[{ client_ts, id, saved, crisis_flag }]` |
| GET  | `/api/checkins` | — | `[{ id, mood_value, note_text, created_at }]` |
| GET  | `/api/insights` | — | `{ trend, message, themes[], resources[] }` |
| GET  | `/api/resources` | — | `[{ id, title, description, url, tags }]` |

Implementation details the frontend must know (agree these as a team):

- **Anonymous identity:** on first visit the frontend creates a random token (e.g. `crypto.randomUUID()`),
  keeps it in `localStorage`, and sends it on every request as the `X-Anon-Token` header.
  The backend stores only its SHA-256 hash. Missing or invalid token → `401 ANON_TOKEN_REQUIRED`.
- **`/api/resources` needs no token**, so the support list always loads.
- **One check-in per WIB day:** a second check-in the same day updates it. `check_date` is derived
  by the backend from `client_ts` (or server time) in Asia/Jakarta.
- **Offline sync:** send queued items with their `client_ts`. It is safe to re-send the same queue;
  the newer tap wins. `saved: true` means the item can be removed from the queue.
- **Phone-only contacts** are returned as `tel:` links in `url`.
- **Errors** always look like `{ "error": { "code", "message" } }` with a 4xx/5xx status.
- **`GET /health`** is for Azure's health check, not for the frontend.

## Crisis rule

Runs **first**, in our own code, before any AI. If a note contains a phrase from the `crisis_keywords`
table, the check-in is saved with `crisis_flag: true`, no insight is returned, and the note is **never**
sent to the LLM. The client then shows the human support screen unconditionally.

The keyword list and the support contacts live in two files the team edits:

| File | What to do before it can be loaded |
|------|------------------------------------|
| `data/crisis-keywords.json` | Review the draft list as a team, then fill in `reviewed_by` and `reviewed_on` |
| `data/resources.json` | For every contact, open the official page, confirm the number/link, then set `verified_at` |

```bash
npm run db:seed-safety   # refuses to load until both files are reviewed/verified; safe to re-run after edits
```

> ⚠️ Until this has been run, the keyword list is empty, crisis detection never triggers, and the server
> logs a warning on startup. Crisis contacts prefer their phone number (`tel:` link) over their website.

## Stage 1 — Rule-based AI

`src/logic/trendRules.js`. No model training: named thresholds on the last 7 days of
`mood_value` (7-day average, consecutive low days, first-half vs second-half change).
Every threshold is listed at the top of the file so it can be explained in the demo.

## Stage 2 — NLP (optional)

`note_text` is sent server-side to a pre-trained large language model through **OpenRouter**.
The model must return JSON only (`sentiment`, `score`, `themes`); its free text is never shown to users.
It runs in the background after the response is sent, and results are stored in `note_analyses`,
so a slow or failed call never affects saving a check-in. The API key stays on the server.
NLP is **off** until both `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are set.
No training data required.

## Tech stack

- **Runtime:** Node.js 22 + Express 5
- **Database:** Azure Database for PostgreSQL — create tables with `npm run db:migrate`
- **Hosting:** Azure App Service (Node 22 LTS runtime)
- **NLP (Stage 2):** OpenRouter LLM, called from the backend only
- **Tests / lint:** built-in `node:test`, ESLint

## Getting started (local)

Requires Node.js 22+ and a PostgreSQL database.

```bash
cd backend
npm install
cp .env.example .env          # then fill in DATABASE_URL (and DB_SSL=false for a local DB)
npm run db:migrate            # creates all tables (safe to run twice)
npm run dev                   # http://localhost:3000, restarts on file changes
```

Demo account for the presentation (so the dashboard is never empty):

```bash
# set DEMO_ANON_TOKEN in .env, then:
npm run db:seed-demo
# in the browser console on the frontend: localStorage.setItem('<token key>', '<DEMO_ANON_TOKEN>')
```

Crisis keywords and support contacts: see [Crisis rule](#crisis-rule) (`npm run db:seed-safety`).

## Tests

```bash
npm run lint
npm test                                            # unit tests only
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/mindmeter_test npm test   # + integration
```

The integration tests **drop and recreate** the schema, so they refuse to run unless the database name
contains `test`.

## Deployment

Deployed to the department **Microsoft Azure** account via the `deploy-azure` job in `.github/workflows/ci.yml`
(fires only on push to `main`, requires the `AZURE_CREDENTIALS` repo secret). On App Service, set the
variables from `.env.example` as Application Settings, with `DB_SSL=true` and `CORS_ORIGIN` set to the
frontend's URL.
