# MindMeter — Weekly Project Plan

**Horizon:** 9 weeks, Mon 19 Oct → Sun 20 Dec 2026 · **Team:** Nalen (536801, CE/BE/AI), Christania (532874, FE/SE), Arya (536660, UI/UX + group lead)

> **Assumptions to confirm (edit here first if wrong):**
> 1. The final demo/submission is around **mid-December** (W8–W9). Confirm the real date and practicum session dates with the lecturers, then shift weeks.
> 2. Each person gives roughly **8–10 focused hours/week**. A buffer week (W9) is included.
> 3. We could not see the GitHub Project board. The milestones, fields and issue breakdown below are what to create there. Put the plan ID (`MM-xxx`) in each issue title; GitHub assigns its own number.
> 4. **Plan was rebased on the actual repo state (17 Oct 2026):** see §0. Items already done are not re-planned.

---

## 0. Where we really are (17 Oct 2026)

| Area | Status | Evidence |
|------|--------|----------|
| API contract | **Done, frozen** | `shared/contract.ts` |
| Backend (Node 22 + Express 5, JavaScript) | **Done locally:** check-ins (upsert, newer wins), sync, list, insights (rule-based), resources, crisis check, anon-token middleware, NLP code (OpenRouter, optional) | `backend/`, 38 passing tests |
| Frontend | **Not started** (only `.gitkeep`) | `frontend/` |
| Azure | **Not provisioned**; `deploy-azure` job in `ci.yml` is a TODO | `.github/workflows/ci.yml` |
| Safety data | **Unreviewed drafts:** crisis keywords have no `reviewed_by`/`reviewed_on`; resources have no `verified_at`. Crisis detection stays off until reviewed and `npm run db:seed-safety` is run | `backend/data/*.json` |
| Design | Not reported; assume lo-fi in progress | — |

**Consequence:** the schedule risk has moved from backend to **frontend, design handoff, Azure and the safety review**. Nalen finishes Azure and hardening, then pairs with Christania on FE integration.

## 1. Weekly rhythm

| Day | What happens | Time |
|-----|--------------|------|
| Mon | 20-min planning: pick this week's issues, confirm owners, move cards to *This week* | 20 min |
| Tue–Thu | Work on your NIU branch, small PRs to `dev`, review each other's PRs within 24 h | — |
| Wed | 10-min async check in chat: blocked? behind? | 10 min |
| Fri | **Integration + demo:** FE against the deployed API, show the increment, merge last PRs into `dev`, Nalen tags `week-N` on `dev`. Then a 15-min retro. `main` is touched only at the final merge (W8). | 45 min |

Trade-off: weekly Friday demos force an always-working increment and early integration, but Friday becomes a hard deadline, so keep scope small and use the cut ladder (§5).

## 2. GitHub Project setup (Monday of W1)

- **Milestones:** `W1 (19–25 Oct)` … `W9 (14–20 Dec)`.
- **Fields:** `Area` (BE/FE/UX/Infra/Docs), `Owner`, `Week`, `Priority` (P0/P1/P2), `Estimate` (S ≈ 2h, M ≈ 4h, L ≈ 8h).
- **Git flow:** issue → commits on your NIU branch (536801 / 532874 / 536660) → PR to `dev` (squash) → one final merge `dev` → `main` at the end (PR-RULES §15).
- **Default branch = `dev`**, so `Closes #n` closes issues.
- **CI deploy trigger:** `deploy-azure` currently runs on push to `main` only. Since `main` is final-only, change it to run on push to `dev` (staging = the live demo environment) and keep `main` for the final tag (MM-103).

## 3. Weekly milestones

| Week | Dates | Theme | Friday exit criteria |
|------|-------|-------|----------------------|
| W1 | 19–25 Oct | Foundations, Azure, FE scaffold | Git flow live (`dev` default, protection, templates); Azure DB + App Service up and API deployed; FE scaffold + mock server; lo-fi wireframes; safety review started |
| W2 | 26 Oct–1 Nov | Check-in + crisis path | FE check-in screen on mock **and** real API; crisis screen designed and built; keyword list + contacts reviewed and seeded on Azure |
| W3 | 2–8 Nov | Dashboard + insights | FE dashboard on live `/insights`, `/resources`, `/checkins`; first end-to-end demo |
| W4 | 9–15 Nov | Offline queue + sync + seed data | Airplane-mode demo works; demo account populated; mid-project review (Fri 13 Nov) |
| W5 | 16–22 Nov | LLM note analysis (optional stage) | Model chosen and tested; themes on dashboard; failure fallback proven |
| W6 | 23–29 Nov | Hardening + networking evidence | Rate limit, CORS, error/empty states; latency + offline evidence collected |
| W7 | 30 Nov–6 Dec | Integration + usability test | Acceptance tests AT-01…AT-10 run; **feature freeze Fri 4 Dec** |
| W8 | 7–13 Dec | Docs, demo prep, polish | Demo rehearsed twice; **code freeze Fri 11 Dec**; final merge `dev` → `main` |
| W9 | 14–20 Dec | Buffer + final demo | Final demo, backup video, retro |

## 4. Week-by-week tasks

Owners: N = Nalen, C = Christania, A = Arya.

### W1 · 19–25 Oct — Foundations, Azure, FE scaffold
| ID | Task | Area | Owner | Est | Dep |
|----|------|------|-------|-----|-----|
| MM-101 | Team sign-off of contract v1.0 and these docs; fill group name | Docs | N+C+A | S | — |
| MM-103 | Git setup (PR-RULES §13, §15.7): `dev` default branch, protection on `dev` only, merge methods, CODEOWNERS, labels, milestones, PR template; point `ci.yml` deploy at `dev` | Infra | N | M | — |
| MM-103b | Everyone dry-runs §15.3 (commit on NIU branch → PR to `dev` → squash → sync) with a tiny docs change | Docs | N+C+A | S | MM-103 |
| MM-104 | Azure: resource group, PostgreSQL, App Service, app settings (`DATABASE_URL`, `CORS_ORIGIN`), HTTPS only | Infra | N | L | — |
| MM-105 | Apply schema and run migrations on Azure; deploy backend; `curl` smoke test of `/health` and `/api/resources` | BE/Infra | N | M | MM-104 |
| MM-107 | Next.js scaffold in JavaScript with `jsconfig.json` (`checkJs` on), `src/lib/api.js` built from `docs/integration/reference-lib` with JSDoc types from `shared/contract.ts`, env URL, mock server from API-REFERENCE examples | FE | C | L | — |
| MM-108 | Lo-fi wireframes: check-in, dashboard, crisis/support, offline states; tone-of-voice notes | UX | A | L | — |
| MM-109 | Start safety review: draft crisis keyword list in English + Indonesian with slang (notes may be in either language); collect official UGM/national contacts with source links | UX/BE | A+N | M | — |
| MM-111 | **English language switch:** translate backend text (trend templates in `trendRules.js`, descriptions in `data/resources.json`, `label_id` in `schema.sql`, comment in `contract.ts`, `.env.example` wording) and update the tests that assert message text. Keep the crisis keywords and the NLP prompt bilingual (English + Indonesian) | BE | N | S | — |

### W2 · 26 Oct–1 Nov — Check-in and crisis path
| ID | Task | Area | Owner | Est | Dep |
|----|------|------|-------|-----|-----|
| MM-201 | Finish safety review: fill `reviewed_by`/`reviewed_on` and `verified_at`; run `npm run db:seed-safety` locally then on Azure; test a crisis phrase end to end | BE/UX | N+A | M | MM-109 |
| MM-206 | Check-in screen (mood buttons, optional note + 200-char counter), loading and success states | FE | C | L | MM-107 |
| MM-207 | Always-visible support entry + crisis full-screen view driven by `crisis_flag` | FE | C | M | MM-108 |
| MM-208 | Hi-fi: check-in, confirmation, support/crisis; design tokens; crisis copy (non-diagnostic) | UX | A | L | MM-108 |
| MM-210 | Switch FE check-in from mock to deployed API; log mismatches as issues | FE | C | S | MM-105 |
| MM-211 | Backend review pass by Christania of the existing code (knowledge sharing) | BE | C | M | — |

### W3 · 2–8 Nov — Dashboard and insights
| ID | Task | Area | Owner | Est | Dep |
|----|------|------|-------|-----|-----|
| MM-305 | Dashboard: 7/30-day chart (Recharts), history list, trend message card, resource cards, empty states | FE | C | L | MM-206 |
| MM-306 | Connect dashboard to `/api/checkins`, `/api/insights`, `/api/resources` | FE | C | M | MM-105 |
| MM-307 | Hi-fi dashboard + empty/loading/error patterns; approve insight message copy | UX | A | L | MM-208 |
| MM-309 | Review the insight message templates in `trendRules.js` with Arya (tone, English) | BE/UX | N+A | S | — |
| MM-310 | Deploy FE to Azure Static Web Apps; set `CORS_ORIGIN` | Infra | N | M | MM-306 |
| MM-308 | **Friday E2E demo #1**, tag `week-3` | All | All | S | all |

### W4 · 9–15 Nov — Offline queue, sync, seed data
| ID | Task | Area | Owner | Est | Dep |
|----|------|------|-------|-----|-----|
| MM-404 | Offline queue (persist in `mindmeter_sync_queue`, enqueue on failure, replay on `online`/app start, chunks ≤ 50, drop bad item by `details.index`) | FE | C | L | MM-306 |
| MM-405 | Offline/queued/syncing UI; cache `/api/resources` for the offline support screen | FE | C | M | MM-404 |
| MM-406 | Design offline states ("saved on this device" language) | UX | A | M | MM-208 |
| MM-403 | Demo-account seed (~4 weeks, improving + declining stretches, invented notes) using `DEMO_ANON_TOKEN` | BE | N | M | MM-105 |
| MM-407 | **Mid-project review** (Fri 13 Nov): check scope-cut ladder (§5); tag `week-4` | All | All | S | all |

### W5 · 16–22 Nov — LLM note analysis (optional)
| ID | Task | Area | Owner | Est | Dep |
|----|------|------|-------|-----|-----|
| MM-501 | Pick the OpenRouter model, test on 20 invented notes (about 10 English, 10 Indonesian), set `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` on Azure | BE | N | M | — |
| MM-503 | Check strict schema validation and malformed-output handling with tests | BE | N | M | MM-501 |
| MM-505 | Themes chips on the dashboard; hide cleanly when empty | FE | C | M | MM-306 |
| MM-506 | Theme chip visuals and copy | UX | A | S | MM-307 |
| MM-507 | Failure drill: remove the key, confirm check-in and dashboard still work | BE | N | S | MM-501 |

### W6 · 23–29 Nov — Hardening and networking evidence
| ID | Task | Area | Owner | Est | Dep |
|----|------|------|-------|-----|-----|
| MM-601 | Add rate limiting (~60/min per IP) and check CORS allowlist and helmet headers (additive, not a contract change) | BE | N | M | — |
| MM-602 | Confirm no note text or token in logs; add a test | BE | N | S | — |
| MM-603 | UI handling for every error code (401, 5xx, network) | FE | C | M | — |
| MM-604 | Accessibility pass (contrast, 44 px targets, labels, keyboard) | FE/UX | C+A | M | — |
| MM-605 | **Networking evidence:** DevTools timings, slow-3G and offline recordings, sync log screenshots | All | N+C | M | MM-405 |
| MM-607 | Cloud evidence: Azure resource screenshots, health check, pipeline run, tier/cost notes | Infra | N | S | — |

### W7 · 30 Nov–6 Dec — Integration and usability testing
| ID | Task | Area | Owner | Est | Dep |
|----|------|------|-------|-----|-----|
| MM-701 | Run acceptance tests AT-01…AT-10 on the live environment; log results in an issue | All | All | M | — |
| MM-702 | Usability test with 5–8 UGM students on invented scenarios (no real distress data); synthesize | UX | A | L | — |
| MM-703 | Fix top bugs and usability issues (P0/P1 only) | All | All | L | MM-701 |
| MM-704 | **Feature freeze Fri 4 Dec**; tag `week-7` | All | All | S | — |

### W8 · 7–13 Dec — Docs, demo, polish
| ID | Task | Area | Owner | Est | Dep |
|----|------|------|-------|-----|-----|
| MM-801 | Demo script (7–8 min): problem → check-in → crisis → dashboard → offline → AI explanation → Azure | All | All | M | — |
| MM-802 | Rehearsals #1 and #2 with timing; record backup video | All | All | M | MM-801 |
| MM-803 | Final Git docs: README quickstart, architecture diagram, ERD, curated PR history | Docs | N+C | M | — |
| MM-804 | Slides/report: rubric mapping (SRD), limits and ethics, future work | Docs | A+N | L | — |
| MM-805 | Quiz prep: each person can explain the whole system | All | All | M | — |
| MM-806 | **Code freeze Fri 11 Dec**; acceptance tests on `dev`; **final merge `dev` → `main`** (merge commit, PR-RULES §15.6); tags `week-8`, `final` | All | N (merge), others check | S | — |

### W9 · 14–20 Dec — Buffer and final demo
| ID | Task | Area | Owner | Est | Dep |
|----|------|------|-------|-----|-----|
| MM-901 | Buffer for overruns and bug fixes (P0 only) | All | All | L | — |
| MM-902 | Pre-demo checklist: `/health` warm-up, demo token, contacts re-verified, backup video | All | N | S | — |
| MM-903 | Final demo; retro; if a P0 fix was needed repeat the final merge and tag `final-1` | All | All | M | — |

## 5. Scope-cut ladder (cut from the top down)

| Order | Item | Consequence | Pros of cutting | Cons |
|-------|------|-------------|-----------------|------|
| 1 | Theme chips polish, 30-day view | Simpler dashboard | Easy, frees FE time | Less impressive |
| 2 | LLM note analysis (W5) | AI story rests on the rule-based layer | Biggest saver; code is already written and stays off by default | Weaker AI narrative |
| 3 | Rate limiting, extra hardening | Less robust | Saves BE time | Risk if demo traffic spikes |
| 4 | Offline queue | Weakens networking grade | Saves FE complexity | **Avoid:** heaviest-weighted differentiator |
| **Never cut** | Crisis path with reviewed data, always-visible support, check-in, rule-based insights, Azure deploy, demo account | | | These are the product |

Review at the Week 4 review; cut early rather than late.

## 6. Dependencies and critical path

`Azure up (MM-104/105) → FE on real API → dashboard → offline queue → hardening → freeze`. Outside coding the blockers are the **safety review (MM-109/201)**, Azure access and the design handoff. Backend risk has dropped because the code exists; the single points of failure are now **Christania (all FE)** and Nalen (all cloud). Mitigation: Nalen pairs on FE integration from W3, Christania reviews backend PRs, Arya delivers designs one screen ahead of FE.

## 7. Risk watch (check in the Friday retro)

| Signal | Action |
|--------|--------|
| More than 2 issues carried over two weeks in a row | Cut scope per §5 immediately |
| FE mock and real API disagree twice in a week | 30-min contract review; fix the mock, not the contract, unless it is a real gap |
| A PR open more than 3 days | Pair on it or split it |
| Safety review not closed by Fri 1 Nov | Block weekend time; no demo with real users before it is done |
| Azure cost or quota warning | Pause non-essential resources, downgrade tier |
| Long-lived NIU branch diverging from `dev` | Sync rule in PR-RULES §15 (sync before work, right after merge) |
