# MindMeter — Development Plan (Design Spec)

Date: 2026-09-28 · Status: approved · Applies from practicum session 6 to 12
Source of truth for scope: Final PRD v1.0. This spec only decides **how the team builds it together**.

## 1. Goal

Keep backend, frontend and design connected so the three parts merge without surprises, and ship
Stage 1 on Azure by session 8.

## 2. Team

| Person | Role | Owns |
|---|---|---|
| Nalen (536801) | Backend + Cloud + AI | Express API, PostgreSQL, rule-based AI, crisis check, OpenRouter, Azure, CI deploy |
| Christania (532874) | Frontend + Software Engineering | Next.js app, API client, offline sync, frontend CI + deploy, testing, usage + demo guides |
| Arya (536660) | UI/UX + group lead | Figma screens and states, design tokens, Indonesian microcopy, Kanban board, demo script, slides |

## 3. Architecture

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS + Recharts, built as a static export
  (`output: 'export'`), hosted on **Azure Static Web Apps**. Pages: `/`, `/checkin`, `/dashboard`, `/support`.
- **Backend:** existing Express 5 API on Node 22 (JavaScript), hosted on **Azure App Service**. Unchanged.
- **Database:** **Azure Database for PostgreSQL**, created with `npm run db:migrate`.
- **AI:** rule-based trend in the backend (Stage 1); OpenRouter LLM called server-side only (Stage 2).
- **Network:** browser → API over HTTPS with JSON; header `X-Anon-Token`; offline queue re-sent via
  `POST /api/checkins/sync`. `CORS_ORIGIN` on the API = the Static Web Apps URL.

Repo layout: `backend/` (existing) · `frontend/` (new) · `shared/contract.ts` (new) · `docs/`.

## 4. Rules that prevent merge problems

1. **One contract file.** `shared/contract.ts` holds the TypeScript types for every request, response and
   the error shape of the 5 endpoints. Types only, no runtime code. The frontend imports it with
   `import type`.
2. **One API file.** Only `frontend/src/lib/api.ts` calls the backend. Components never call `fetch`.
3. **Contract changes travel together.** Changing the API means changing `contract.ts`, backend code and
   backend tests in the same PR, labelled `contract-change`, approved by both Nalen and Christania.
4. **CI is the gate.** Backend: lint + 38 tests on PostgreSQL. Frontend: lint + `tsc --noEmit` + build.
   A red PR cannot be merged.
5. **Fixed storage keys.** `localStorage["mindmeter_anon_token"]` = `crypto.randomUUID()`;
   `localStorage["mindmeter_sync_queue"]` = pending check-ins.

## 5. Work per person

**Backend (Nalen)**
1. Session 6, first: add `shared/contract.ts` and `docker-compose.yml` (PostgreSQL + migrate + demo seed)
   so the API runs locally with one command.
2. Create Azure resource group, PostgreSQL, App Service; run migrate + seed; set app settings; make the
   `deploy-azure` CI job real.
3. Load the team's crisis keyword list and verified UGM contacts.
4. Stage 2: verify the OpenRouter model string, test on Indonesian notes, enable NLP.

**Frontend + SE (Christania)**
1. Scaffold Next.js in `frontend/`; write `lib/api.ts`, `lib/anonToken.ts`, `lib/syncQueue.ts`.
2. Build pages in safety-first order: support/crisis → check-in (+ offline) → dashboard (+ empty, loading,
   error) → landing.
3. Frontend CI job and Static Web Apps deploy; run the manual end-to-end checklist (crisis path first).
4. Write the usage guide and demo guide (rubric: documentation 20%).

**UI/UX (Arya)**
1. Design tokens (colours, type, spacing) handed over as Tailwind theme values.
2. One Figma frame per screen with every state (normal, empty, loading, error, offline, crisis), one screen
   ahead of the frontend build order.
3. Indonesian microcopy: calm, non-clinical, with a clear "not a diagnostic tool" statement.
4. Keep the Kanban board current; own the demo script and presentation.

## 6. Handoffs

| From → To | What | Where |
|---|---|---|
| Backend → Frontend | `contract.ts`, local API, deployed API URL, demo token | PR / README |
| UI/UX → Frontend | Figma frame per screen with all states, before the build starts | Figma link in the card |
| Frontend → Backend | Bug report with request, response, expected result | GitHub issue |

## 7. Git workflow

- Personal branches (`536801`, `532874`, `536660`) → PR into `dev` (green CI + 1 approval).
- `dev` → `main` only at milestones; merging to `main` deploys to Azure.
- Commit prefixes: `feat:`, `fix:`, `docs:`, `test:`.
- Definition of done: merged to `dev`, CI green, works on the deployed site.

## 8. Timeline

| Session | Backend | Frontend + SE | UI/UX |
|---|---|---|---|
| 6 | contract.ts + docker-compose; create Azure resources | Scaffold, libs, support screen | Tokens; support + check-in screens; lead crisis keyword list |
| 7 | Deploy API; load keywords + contacts | Check-in + offline sync; SP 2.4 crisis end-to-end test | Dashboard screen, all states |
| 8 | Seed demo on Azure; integration help | Dashboard + landing; deploy to Static Web Apps | Landing; review built screens |
| — | **Milestone 1: Stage 1 live on Azure (`dev` → `main`)** | | |
| 9 | Verify OpenRouter + Indonesian test | Test checklist on Azure; bug fixes | Polish from feedback |
| 10 | Enable NLP; themes in insights | Themes on dashboard; usage guide | Demo script draft |
| — | **Milestone 2: Stage 2 done** | | |
| 11 | Regression + fixes | Regression; demo guide | Slides |
| — | **Milestone 3: code freeze** | | |
| 12 | Rehearse demo; final docs | same | same |

## 9. Fallback

Stage 2 (NLP) is the stretch goal. Stage 1 already covers networking, cloud and rule-based AI. If the team
is behind at session 9, sessions 9–10 become testing and polish instead of NLP.
