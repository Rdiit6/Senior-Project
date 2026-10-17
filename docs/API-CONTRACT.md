# MindMeter API Contract
**Source of truth:** [`shared/contract.ts`](../shared/contract.ts) for the types, plus the backend code and tests for behaviour. This document explains the behaviour in plain language and lists what each side must do. If this file and `shared/contract.ts` ever disagree, `contract.ts` and `backend/tests/integration/api.test.js` win and this file gets fixed in the same PR.

How the two sides stay matched (rules from the team's Development Plan, still in force):

1. Types live **only** in `shared/contract.ts` (types only, no runtime code). The frontend uses `import type` and only in `frontend/src/lib/api.ts`.
2. Only `frontend/src/lib/api.ts` calls the backend. Components never call `fetch`.
3. The backend integration tests type-check every real response against `contract.ts` in CI, so drift fails the build.
4. Changing the API = **one PR** that changes `contract.ts`, the backend code, and the backend tests, labelled `contract-change`, approved by both owners (PR-RULES §8).

Tested reference code for the frontend side is in [`docs/integration/reference-lib/`](./integration/reference-lib/README.md) (`api.ts`, `anonToken.ts`, `syncQueue.ts`).

---

## 1. Conventions

| Topic | Rule |
|-------|------|
| Base URL | Local API `http://localhost:3000` (frontend runs on `http://localhost:3001`, set `NEXT_PUBLIC_API_URL`). Production: the Azure App Service URL, HTTPS. |
| Format | JSON in and out, UTF-8, `snake_case` fields. Request body limit 32 KB. Unknown request fields are ignored. |
| IDs | `id` is a UUID string. Treat it as opaque. |
| Timestamps | ISO 8601, e.g. `2026-10-19T09:15:00+07:00` or `...Z`. |
| "Day" | A check-in day is the calendar date in **Asia/Jakarta (WIB)**, derived by the backend from `client_ts` (or its own clock). |
| Language | **Product language is English** (team decision). `message` and resource text are display-ready English; show as given. Users may still type notes in Indonesian or English, so the crisis check and the NLP step must handle both (§5.2, §5.7). |
| CORS | Allowed origins come from the backend `CORS_ORIGIN` env var (required in production; set it to the Static Web Apps URL). |
| Security headers | `helmet` is on. |

## 2. Identity (anonymous token)

No login. The browser creates a token once and sends it on every request except `GET /api/resources`:

```
X-Anon-Token: 3f1c2a0e-8d2b-4c58-9a77-5d6f0e1b9c11
```

- Create with `crypto.randomUUID()` and keep it in `localStorage["mindmeter_anon_token"]`. Never rename the keys: `mindmeter_anon_token`, `mindmeter_sync_queue`.
- Accepted format: 16–128 characters, letters, digits, `_` or `-` (a UUID qualifies).
- The backend stores only the **SHA-256 hash**, creating the user on first sight.
- Missing or malformed → `401 ANON_TOKEN_REQUIRED`.
- `GET /api/resources` is mounted before the token check so the support list always loads.
- Demo account: set the same value as `DEMO_ANON_TOKEN` in the backend and in the demo browser's `localStorage` (keep the value out of the repo and out of chat).

## 3. Endpoints

| # | Method & path | Token | Purpose |
|---|---------------|:-----:|---------|
| E1 | `POST /api/checkins` | yes | Save today's check-in (create or update) |
| E2 | `POST /api/checkins/sync` | yes | Replay offline-queued check-ins (idempotent) |
| E3 | `GET /api/checkins` | yes | The user's check-ins for the dashboard |
| E4 | `GET /api/insights` | yes | Trend message, themes, matched resources |
| E5 | `GET /api/resources` | **no** | Support and self-help resources |
| — | `GET /health` | no | Azure health check. **Not part of the frontend contract.** |

Exact request/response types: `shared/contract.ts` (`CheckinRequest`, `CheckinResponse`, `SyncRequest`, `SyncResponse`, `CheckinListResponse`, `InsightResponse`, `ResourcesResponse`, `ApiErrorResponse`, and the `Endpoints` map). Examples: [API-REFERENCE.md](./API-REFERENCE.md).

## 4. Validation (backend enforces; frontend should mirror for UX)

| Field | Rule | If broken |
|-------|------|-----------|
| `mood_value` | integer 1–5 | `400 VALIDATION_ERROR` |
| `note_text` | optional string, trimmed; blank counts as no note; at most 200 characters | `400` if longer or not a string |
| `client_ts` (E1) | optional ISO 8601; if present: not more than 10 min in the future, not older than 30 days | `400` |
| `client_ts` (E2) | **required** on every item, same limits | `400` for the whole request, with `details.index` |
| E2 body | JSON array of 1–50 items | `400`; body over 32 KB → `413 BODY_TOO_LARGE` |
| Bad JSON | | `400 INVALID_JSON` |

## 5. Behaviour both sides rely on

### 5.1 One check-in per day
`UNIQUE(user, WIB day)`. A second check-in the same day **updates** the first. `POST /api/checkins` always returns **200** with the row's `id` (create and update look the same). For a live check-in omit `client_ts`; the server uses its own time.

### 5.2 Crisis rule (safety-critical, same order every time)
_The phrase list must stay **bilingual (English + Indonesian, with slang)** even though the UI is English, because UGM students write notes in either language._

1. Validate. 2. **Keyword check in backend code** on the normalized note (lowercase, punctuation to spaces, whole-word phrase match; phrases come from the `crisis_keywords` table). 3. Save the check-in with `crisis_flag`. 4. If crisis: **stop**. No insight, no LLM call; the note is never sent to the LLM. 5. Otherwise return the rule-based insight, and queue NLP in the background if it is enabled.

When the response has `crisis_flag: true` the frontend **must** show the support screen immediately (TypeScript forces checking `crisis_flag` before reading `insight`). The support screen lists `GET /api/resources`; the primary crisis contact comes first.

> The crisis keyword list is **empty until `npm run db:seed-safety` has been run**, and that script refuses to load the list until it is reviewed (`reviewed_by`, `reviewed_on`) and every contact has `verified_at`. Until then crisis detection never fires. This must be done before any demo or test with real users.

### 5.3 Offline sync (`POST /api/checkins/sync`)
- The frontend queues taps made offline in `localStorage["mindmeter_sync_queue"]` with `client_ts`, then replays them when back online (≤ 50 per request).
- The backend processes items **oldest first** and applies the same crisis check per item. For each day the **newer `client_ts` wins**; re-sending the same queue is safe.
- The response has one result per item, same order, `client_ts` echoed. `saved: true` means: remove it from the queue (stored, or a newer check-in already exists for that day). `crisis_flag` reflects the note that was sent; if any is `true`, show the support screen.
- **All-or-nothing validation:** one invalid item (for example older than 30 days or a mood of 6) makes the **whole request** fail with `400` and `details.index`. The frontend must then drop **that item** from the queue and retry the rest, or the queue will fail forever.
- Network failure, `5xx`: keep the queue untouched and retry later.

### 5.4 Listing
`GET /api/checkins` returns the last **90 days**, **oldest first**, one item per WIB day, `note_text` is `null` when there is none. `[]` means "show the empty state", never an error.

### 5.5 Insights (Stage 1 rule-based AI, computed on every request)
Rules in `backend/src/logic/trendRules.js`; thresholds are named constants at the top of that file.

| Constant | Value | Meaning |
|----------|-------|---------|
| `WINDOW_DAYS` | 7 | Last 7 calendar days (WIB) including today |
| `MIN_ENTRIES` | 3 | Fewer check-ins → `trend: "stable"` with the "check in a few more days" message |
| `LOW_MOOD` | 2 | Mood 1–2 is a "low day" |
| `LOW_STREAK_DAYS` | 3 | Consecutive low calendar days (a missing day breaks the streak) |
| `LOW_AVERAGE` | 2.5 | 7-day average at or below this means support is needed |
| `TREND_DELTA` | 0.75 | Second-half average minus first-half average |

`trend` is `"declining"` if the low streak ≥ 3 **or** delta ≤ −0.75; `"improving"` if delta ≥ +0.75; otherwise `"stable"`. `message` is a fixed English template (low streak, declining, improving, low, stable, not enough data). Support is "needed" when the streak ≥ 3 or the average ≤ 2.5; that is internal and only changes which `resources` are returned.

`themes` are theme codes from completed NLP analyses of this week's notes (empty while NLP is off). `resources` is up to 3 items: those tagged with the user's themes, plus counselling/crisis contacts when support is needed.

### 5.6 Resources
Public. `tags` are theme codes. Phone-only contacts come back as a `tel:` link in `url`; crisis contacts prefer the phone number. Order: primary crisis contact first.

### 5.7 NLP (Stage 2, optional)
Off until both `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are set on the server. Runs in the background after the response; a slow or failed call never affects saving a check-in, it only means `themes` stays empty.

## 6. Theme codes (fixed vocabulary)

`sleep`, `workload`, `exams`, `isolation`, `relationships`, `finance`, `health`, `motivation` (type `ThemeCode` in `contract.ts`; table `themes`).

## 7. Errors

Every 4xx/5xx has the shape `{ "error": { "code", "message", "details"? } }`.

| HTTP | `code` | When | Frontend behaviour |
|------|--------|------|--------------------|
| 400 | `VALIDATION_ERROR` | Bad body; `message` says what; sync adds `details.index` | Inline message; for sync drop the bad item and retry the rest |
| 400 | `INVALID_JSON` | Unparseable body | Treat as a bug; generic message |
| 401 | `ANON_TOKEN_REQUIRED` | Header missing or malformed | Recreate the token only if it is missing locally; otherwise show a generic error |
| 404 | `NOT_FOUND` | Unknown route | Generic error |
| 413 | `BODY_TOO_LARGE` | Over 32 KB | Send smaller sync chunks |
| 500 | `INTERNAL_ERROR` | Bug | Gentle retry message; keep queued items |

An OpenRouter failure never produces an error response.

## 8. Test checklist (backend integration tests and frontend mock scenarios)

| Scenario | Expected |
|----------|----------|
| No token on `POST /api/checkins` | 401 `ANON_TOKEN_REQUIRED` |
| `GET /api/resources` without a token | 200 |
| `mood_value: 6` / note of 201 characters | 400 `VALIDATION_ERROR` |
| Two POSTs on the same day | both 200, same `id`, one row |
| Note containing a listed crisis phrase | `crisis_flag: true`, no `insight`, no LLM call |
| Sync the same queue twice | both `saved: true`, one row per day |
| Sync with one bad item | 400, `details.index` points at it |
| Sync 51 items | 400 |
| OpenRouter down or not configured | check-in saved normally, `themes: []` |

## 9. Known gaps (candidates for the plan)

| Gap | Impact | Suggested handling |
|-----|--------|--------------------|
| No rate limiting | A stray client could hammer the free-tier API | Add a small limiter (about 60 requests/min per IP) as a hardening task; additive, not a contract change |
| `GET /health` lives outside `/api` | None for the frontend | Keep; use it as the App Service health-check path |
| Sync is all-or-nothing | One bad queued item blocks the rest unless the frontend drops it | Frontend rule in §5.3; or make the backend per-item later via a `contract-change` |
| Crisis list/contacts not yet reviewed and loaded | Crisis path inactive | Team review, then `npm run db:seed-safety` (see §5.2) |
| Backend text still Indonesian (trend templates in `trendRules.js`, resource descriptions in `data/resources.json`, `label_id` in `schema.sql`, comment in `contract.ts`) | UI would mix languages | Translate in one small PR; behaviour and types do not change, but update the tests that assert the message text (PROJECT-PLAN MM-111) |
