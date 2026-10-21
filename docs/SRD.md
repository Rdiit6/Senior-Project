# MindMeter — Software Requirements Document (SRD)
**Status:** Proof of Concept. **Not** a medical, diagnostic or clinical product.

Related: [API-CONTRACT.md](./API-CONTRACT.md) · [API-REFERENCE.md](./API-REFERENCE.md) · [PROJECT-PLAN.md](./PROJECT-PLAN.md) · [PR-RULES.md](./PR-RULES.md)

---

## 1. Introduction

### 1.1 Purpose
Define what MindMeter must do, the constraints it works under, and the acceptance criteria that tell the team (and graders) the product is done.

### 1.2 Product summary
MindMeter is a web app for UGM students' private self-reflection. A student logs a one-tap daily mood check-in with an optional short note. The app reflects their own pattern back gently (rule-based trend, plus themes extracted from notes by an LLM) and keeps real human support one tap away.

### 1.3 Scope
In scope (PoC): daily check-in, personal pattern dashboard, support and crisis path, offline check-in queue with sync, anonymous identity, Azure deployment, seeded demo account.
Out of scope: login/accounts, push/email reminders, campus-level aggregates, training any model, any diagnosis or clinical claim, native mobile apps, admin portal.

### 1.4 Definitions
| Term | Meaning |
|------|---------|
| Check-in | One mood value (1–5) plus optional note for one Jakarta calendar day |
| Crisis flag | Boolean decided only by backend keyword rules, before any AI |
| Insight | Plain-language trend message from rule-based logic |
| Theme | Topic label from a fixed list, extracted from notes by an LLM |
| Offline queue | Browser-side list of check-ins awaiting sync |
| Anonymous token | Random UUID in the browser identifying a user without PII |

### 1.5 Stakeholders
Students (users) · the 3-person team · course lecturers (graders) · UGM wellbeing services (support partner, future licensee in the B2B narrative).

## 2. Overall description

### 2.1 Context and technologies
Client (Next.js + TypeScript, desktop-first) ↔ REST over HTTPS ↔ API (Node.js + Express, Azure App Service) ↔ Azure Database for PostgreSQL. The API calls OpenRouter (LLM) server-side. This covers the three required technologies:

| Technology | How MindMeter uses it |
|------------|-----------------------|
| Computer networks | REST/HTTPS client–server, CORS, rate limiting, offline queue + idempotent sync for unreliable campus wifi |
| Cloud computing | Azure App Service + Azure PostgreSQL, app settings for secrets, health check, CI/CD deploy |
| Artificial intelligence | Rule-based trend detection (graded baseline) + LLM sentiment/theme extraction on notes, JSON-constrained output, graceful fallback |

### 2.2 User characteristics
UGM students, mostly on phones, often on slow or intermittent wifi, possibly stressed. Low tolerance for friction. No technical skill assumed.

### 2.3 Operating environment
Latest two versions of desktop Chrome, Firefox and Edge, at 1280 px wide and up (designs use a 1440 px frame). **Desktop first:** mobile browsers and phone widths (360 px) are deferred to a later phase. Pages should not break on a phone, but phone layouts are not designed or acceptance-tested in this phase.

### 2.4 Constraints
- One-semester timeline, 3 beginners. Deployed on the department's Azure account.
- Must never claim clinical function; must route to real human support.
- No PII collected. Never train a model; use a pre-trained LLM via API.
- Free/low-tier Azure and OpenRouter budget.

### 2.5 Assumptions
- **Desktop first (team decision, 21 Oct 2026):** design and acceptance target desktop browsers (1440 px design frame, 1280 px minimum). Mobile layouts are out of scope for this phase.
- Students have a browser; JavaScript and `localStorage` enabled.
- A verified list of UGM crisis contacts and a keyword list will be provided by the team (open items O4, O5).
- Approximate demo date mid-December 2026 (confirm with lecturers; see PROJECT-PLAN).

## 3. Functional requirements

Priority: **M** Must · **S** Should · **C** Could. Each has acceptance criteria (AC).

| ID | Pri | Requirement | Acceptance criteria |
|----|-----|-------------|---------------------|
| FR-01 | M | **One-tap check-in.** User selects a mood 1–5 from the home screen and it is saved. | AC: 1 tap saves; confirmation shown in < 1 s perceived; works with no note. |
| FR-02 | M | **Optional note** up to 200 characters. | AC: counter shown; 201st char blocked in UI and rejected `400` by API; empty note allowed. |
| FR-03 | M | **One check-in per day.** A second check-in on the same Jakarta date updates the first. | AC: two POSTs same day → one row; API returns 200 both times with the same `id`. |
| FR-04 | M | **Anonymous identity** via browser token; no name/email/demographics. | AC: no PII fields in DB/API; token stored hashed (SHA-256); app works with no sign-in. |
| FR-05 | M | **Crisis detection before AI.** Backend keyword check on every note, before any LLM call. | AC: crisis phrase → `crisis_flag: true`, LLM not called, covered by unit tests for English and Indonesian variants (users may write in either). |
| FR-06 | M | **Crisis screen.** When `crisis_flag` is true the FE shows a full-screen support view immediately. | AC: shows verified contacts first; one tap to call/open; cannot be dismissed accidentally by the check-in confirmation. |
| FR-07 | M | **Always-visible support entry** on every screen. | AC: visible without scrolling at desktop width (1280 px and up) on all routes, including offline. The 360 px check moves to the mobile phase. |
| FR-08 | M | **Mood dashboard.** Chart of the user's check-ins (7 and 30 day views) and history list. | AC: correct points per Jakarta day; empty state for no data; loads < 2 s on 4G. |
| FR-09 | M | **Rule-based trend insight** per API-CONTRACT §5.5 with plain-language, non-diagnostic messages. | AC: unit tests for each trend row and boundaries; messages approved by UX; no diagnostic words. |
| FR-10 | M | **Resource cards** matched to trend/themes; `crisis`-tagged first when `low`. | AC: `GET /api/resources` and `/api/insights` return verified entries; links open correctly. |
| FR-11 | M | **Offline queue and sync.** Check-ins made offline are stored locally and synced idempotently when back online. | AC: airplane-mode test: 3 taps queued → reconnect → 3 rows, no duplicates, replay twice safe. |
| FR-12 | S | **LLM note analysis** (sentiment + themes from a fixed theme list) via OpenRouter, asynchronous, JSON only. | AC: output validated against schema; invalid/timeout → status `failed`, no user-visible error; check-in always saved. |
| FR-13 | S | **Themes on dashboard** (top ≤ 3 over 14 days). | AC: shown only when analyses are `done`; hidden gracefully otherwise. |
| FR-14 | M | **Demo seed account** with ~4 weeks of varied data (incl. an improving and a declining stretch). | AC: demo token shows a populated dashboard instantly; seed contains invented notes only. |
| FR-15 | M | **Disclaimer & framing.** App states it is reflection and signposting, not medical advice. | AC: visible on first use and in the footer/about; no diagnostic language anywhere. |
| FR-16 | C | Data deletion by user (`DELETE /api/me`). | Decision pending; see API-CONTRACT §9; not in the frozen contract, would need a `contract-change` PR. |

Won't (this PoC): login, reminders (schema columns exist, no sending), campus aggregates, model training.

## 4. Non-functional requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | `POST /api/checkins` p95 < 500 ms (LLM runs asynchronously, never in the request path). Dashboard first load < 2 s on 4G; JS bundle for the home route < 200 KB gzipped (target). |
| NFR-02 | Availability | Demo-week uptime target 99% (best effort on tier used); `/health` monitored. App remains usable offline for check-in and support. |
| NFR-03 | Security | HTTPS only; input validated server-side; rate limit 60/min/IP; CORS allowlist; secure HTTP headers (e.g. Helmet); parameterized queries; secrets only in App Service settings/GitHub secrets; dependency audit in CI. |
| NFR-04 | Privacy | No PII; token hashed; notes ≤ 200 chars; **no note text, tokens or hashes in logs**; notes sent to the LLM only when not crisis-flagged, with no identifiers attached; no real student notes in tests/seeds. |
| NFR-05 | Safety | Crisis logic deterministic and tested first; support always visible; LLM output never shown as advice, only used for theme labels. |
| NFR-06 | Usability / accessibility | One-tap core action; tap targets ≥ 44 px; WCAG AA contrast; usable with screen reader labels on mood buttons; calm, uncluttered, non-clinical tone. |
| NFR-07 | Reliability | Idempotent sync; DB constraints enforce one check-in per user per day; LLM failure never blocks saving. |
| NFR-08 | Maintainability | Shared TS contract; CI (lint, types, tests, build); docs updated with code; thresholds/config in one file. |
| NFR-09 | Observability | Structured logs with `request_id`, route, status, latency; error tracking via logs only (no PII). |
| NFR-10 | Portability | Environment-driven config (`.env.example`); same container/Node runtime locally and on Azure. |

## 5. External interfaces

- **REST API:** see [API-CONTRACT.md](./API-CONTRACT.md) (E1–E5).
- **OpenRouter:** server-to-server HTTPS. Model name in env var `OPENROUTER_MODEL` (exact string and English plus Indonesian note quality to be verified in W5, MM-501). Prompt asks for JSON only with themes from the fixed list; the server validates and discards anything else. The note of a crisis-flagged check-in is never sent.
- **Database:** Azure PostgreSQL, 8 tables per `backend/src/models/schema.sql` (`users`, `checkins`, `note_analyses`, `themes`, `analysis_themes`, `resources`, `resource_themes`, `crisis_keywords`), ERD at `docs/image/ERD.png`.

## 6. Data requirements

| Data | Notes |
|------|-------|
| Check-in | `mood_value` 1–5, `note_text` ≤ 200, `check_date` (Jakarta), `created_at`, `client_ts`; unique per user per day |
| User | SHA-256 token hash, `is_demo`, reminder columns (unused) |
| Note analysis | Separate table with status `pending/done/failed`; themes via join table |
| Resources / keywords | Loaded by script after manual verification; **not** auto-seeded |
| Retention | PoC: keep for the project period; document a deletion plan; delete demo/test data after grading |

## 7. Safety, ethics and privacy requirements

1. No diagnosis, scores of "depression/anxiety", or medical claims, in UI, API messages, docs or the presentation.
2. Crisis path is deterministic code, runs before the LLM, and cannot be overridden by AI output.
3. Honest limits: keyword detection has false negatives and false positives; therefore support is always visible and the app says it is not an emergency service.
4. Insight copy is reviewed by the UX designer and, ideally, a counselling contact before the demo.
5. Usability testing uses invented/consented scenarios; no collection of real distress data during testing.
6. Presentation framing: "reflection + signposting", never "AI therapist".

## 8. Rubric traceability

| Rubric item (weight) | How this SRD delivers it | Requirements |
|----------------------|--------------------------|--------------|
| Problem/solution (10%) | Student wellbeing problem, privacy-first low-friction solution, B2B-to-university narrative | §1, FR-01, FR-07, FR-15 |
| Networking (20%) | REST/HTTPS contract, CORS, rate limit, offline queue + idempotent sync, latency evidence | FR-11, NFR-01, NFR-03, API-CONTRACT §1, §5.3 |
| Cloud (20%) | Azure App Service + PostgreSQL, health check, secrets, CI/CD, seeded demo | NFR-02, NFR-03, NFR-10, FR-14 |
| AI (20%) | Rule-based trends (baseline) + LLM themes with validation and fallback | FR-09, FR-12, FR-13 |
| Smooth demo (5%) | Demo account, rehearsed script, offline demo, health pre-flight | FR-14, PROJECT-PLAN W8 |
| Process (50%: Git docs 20%, quizzes 20%) | PR rules, weekly milestones, tags, issue history | PR-RULES, PROJECT-PLAN |

## 9. Acceptance tests (demo-critical)

| ID | Scenario | Expected |
|----|----------|----------|
| AT-01 | New user taps mood 3 | Saved, calm confirmation, appears on dashboard |
| AT-02 | Same user checks in again the same day with a different mood | Day updated, no duplicate |
| AT-03 | Note with a crisis phrase (invented test phrase from the keyword list) | Full-screen support view, verified contacts first, no AI insight |
| AT-04 | Airplane mode → 3 check-ins → reconnect | Queue empties, 3 correct days, no duplicates |
| AT-05 | Kill OpenRouter key/network | Check-in still saves, dashboard works, themes empty |
| AT-06 | Demo account | Populated chart, a trend message, themes, resources |
| AT-07 | Support entry on every screen at desktop width (1280 px) | Always visible and working |
| AT-08 | 101 rapid requests in a minute from one IP (only once rate limiting is added, PROJECT-PLAN MM-601; stretch goal) | `429` after the limit, app recovers |
| AT-09 | Inspect logs after AT-01…AT-05 | No note text, token or hash present |
| AT-10 | Fresh deploy on Azure then `/health` | HTTP 200 from `/health` |

## 10. Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Beginner team underestimates integration work | Late demo | Weekly integrated increments, contract-first mocks, scope-cut ladder (PROJECT-PLAN §5) |
| Crisis keyword false negatives | Missed distress | Always-visible support, honest limits, broad English + Indonesian list incl. slang, reviewed list, tests |
| LLM quality poor on English or Indonesian notes, or model string wrong | Weak AI grade | Verify in Week 2 (O3) with 20 invented notes; rule-based layer is the graded baseline; model name is configurable |
| Wrong/unverified support contacts | Real harm | `safety` label PRs, 2 approvals, verify against official pages, record verification date |
| Campus wifi flaky during demo | Failed demo | Offline queue is a feature; demo account; local recorded fallback video |
| Azure free-tier cold starts / quotas | Slow first request | Always-on if available, warm-up before demo, health check |
| Token loss (cleared browser) | User loses history | Documented limitation; optional export/restore is future work |
| Scope creep (login, reminders, aggregates) | Missed core | "Won't" list enforced in planning |

## 11. Decision records (with pros and cons)

**DR-01 Anonymous browser token instead of login**
Pros: zero friction, no PII, fits privacy story, far less work. Cons: no cross-device history, loses data if storage cleared, bearer-token risk. Chosen for PoC; revisit with SSO for a real university rollout.

**DR-02 Rule-based trends + LLM themes (two AI layers)**
Pros: rules guarantee a reliable, explainable AI baseline; LLM adds NLP value on notes. Cons: two things to test; LLM cost/latency/quality risk. Mitigation: LLM is asynchronous and optional; never on the crisis path.

**DR-03 Crisis keywords in backend code, before the LLM**
Pros: deterministic, auditable, instant, works if the LLM is down. Cons: misses indirect language, false positives. Mitigation: broad list, tests, always-visible support, honest disclosure.

**DR-04 Offline queue + idempotent `/sync`**
Pros: resilient on campus wifi, strong networking story. Cons: more FE state and conflict logic. Mitigation: simple rule "newer `client_ts` wins", per-day uniqueness in the DB.

**DR-05 One check-in per day (upsert)**
Pros: clean daily series, simple charts, idempotency. Cons: cannot track intra-day swings. Acceptable for a daily-reflection tool.

**DR-06 LLM analysis in a separate table, async**
Pros: a failed call never blocks saving; easy retry; clean separation. Cons: eventual consistency (themes appear later). Acceptable.

**DR-07 Next.js + TypeScript frontend with shared contract types**
Pros: compile-time contract matching, good mobile performance, one language across the stack. Cons: more tooling than plain HTML for beginners; SSR concepts can distract. Mitigation: use the client-rendered app router pages only, keep it simple. (Note: the earlier Final Decisions document listed the framework as undecided; this reflects the later decision to use Next.js.)

**DR-08 Git flow: trunk-based rules (PR-RULES §1–§14) plus NIU personal branches and a `dev` branch (§15)**
Pros: keeps the team's existing habit of working on a personal NIU branch; `dev` is the single integration branch and `main` is a clean final snapshot reached by one merge at the end; weekly progress is tagged on `dev`; squash keeps one commit per issue. Cons: long-lived personal branches can produce phantom conflicts or bloated PRs; `main` is deliberately unprotected (team decision), so only team discipline keeps it untouched until the final merge; GitHub only auto-closes issues on the default branch. Mitigations (sync-before-work, freeze rule, sync-after-merge, `dev` as default branch, merge-commit final merge) are in PR-RULES §15.4–§15.5. Fallback if it hurts by Week 4: task branches straight into `dev`.

## 12. Open items

See `docs/README.md` open items O1–O6 (group name, contract sign-off, OpenRouter model check, verified crisis contacts, keyword list, UI language, now decided: English, see DR-09). Items O3–O5 block FR-05, FR-06, FR-10 and FR-12 from being considered done.

**DR-09 Product language: English**
Decision: all UI copy, insight messages, resource descriptions and docs are in English. Pros: matches the team's documents and the lecturers' review, one language across code, tests and demo, simpler copywriting. Cons: some UGM students think and write in Indonesian, so English-only copy may feel less natural to them. Mitigation (important for safety): the crisis keyword list and the LLM prompt stay bilingual (English + Indonesian, with slang), because users may write notes in either language even when the interface is English. Revisit: adding an Indonesian UI later means moving strings into one translation file; the API contract does not change.
