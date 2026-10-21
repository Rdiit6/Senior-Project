# MindMeter — Project Docs

Senior Project Practicum, DTETI UGM · Group: **[fill in]** · Proof of Concept (not a clinical tool)

This folder is the single source of truth for how we build MindMeter. If code and docs disagree, **fix one of them in the same PR**.

## Read in this order

| # | File | What it answers | Owner |
|---|------|-----------------|-------|
| 1 | [SRD.md](./SRD.md) | What are we building, for whom, and how do we know it is done? | Radit |
| 2 | [API-CONTRACT.md](./API-CONTRACT.md) | The rules FE and BE both obey (types, errors, headers, behaviours). **Frozen.** | Radit + Christania |
| 3 | [API-REFERENCE.md](./API-REFERENCE.md) | Per-endpoint requests/responses/curl. Copy-paste for FE mocks and BE tests. | Radit |
| 4 | [PR-RULES.md](./PR-RULES.md) | Branches, commits, PRs, reviews, CI, merging. | All |
| 5 | [PROJECT-PLAN.md](./PROJECT-PLAN.md) | Week-by-week plan and GitHub issue breakdown. | All |

## Team

| Person | Role | Owns |
|--------|------|------|
| Nalen (536801) | Cloud Engineer + Backend + AI logic | API, DB, rule-based insights, crisis check, OpenRouter call, Azure, deploy, seed data |
| Christania (532874) | Frontend / Software Engineer | Next.js + TypeScript app, API calls, offline queue + sync, loading/empty/error states |
| Arya (536660) | UI/UX Designer | Wireframes, visual design, screens, copy tone, design handoff, usability testing |

## Repo layout (target)

```
/
├─ backend/            Node 22 + Express 5 (JavaScript, tests with node:test)
│  └─ src/models/schema.sql
├─ frontend/           Next.js + TypeScript
├─ shared/
│  └─ contract.ts      TS types only, the single source of truth (FE imports via src/lib/api.ts)
├─ docs/
│  ├─ README.md  SRD.md  API-CONTRACT.md  API-REFERENCE.md  PR-RULES.md  PROJECT-PLAN.md
│  └─ image/ERD.png
└─ .github/
   ├─ PULL_REQUEST_TEMPLATE.md   (copy from PR-RULES.md §12)
   └─ workflows/ci.yml
```

## Golden rules (the 6 that matter most)

1. **Contract first.** Nobody codes an endpoint or a screen that the contract does not describe. Change the contract by PR, label `contract-change`.
2. **Crisis path is never generative.** Keyword check in backend code runs *before* any LLM. `crisis_flag` is decided by the backend only.
3. **Support is always one tap away** on every screen.
4. **Never log or commit note text, tokens, or secrets.**
5. **MindMeter never diagnoses.** Copy says "reflects your pattern", never "you are depressed".
6. **Small PRs, reviewed by someone else, linked to an issue.** That is also our Git-docs grade (20%).

**Language:** the product (UI, insight messages, resource text, docs) is **English**. Crisis keywords and the OpenRouter prompt stay English + Indonesian because students may write notes in either (SRD DR-09).

## Git flow in one line

`issue` → commits on **your NIU branch** (e.g. `536801`, each commit ends with `(#12)`) → **PR to `dev`** (squash) → weekly tag `week-N` on `dev` → one final merge to `main` at the end (`main` is not protected, so nobody touches it before that). Base rules are PR-RULES §1–§14; the NIU/`dev` addendum with commands and pitfall fixes is §15: [PR-RULES.md](./PR-RULES.md).

## Open items (blocking, owner, due)

| # | Item | Owner | Due |
|---|------|-------|-----|
| O1 | Fill in the group name in every doc | Arya | Fri 23 Oct |
| O2 | Team sign-off of these docs and the frozen `shared/contract.ts` | Radit + Christania + Arya | Fri 23 Oct |
| O3 | Choose and verify the OpenRouter model (20 invented sample notes, English + Indonesian); optional stage, W5 | Radit | Fri 20 Nov |
| O4 | Verify real UGM and national crisis contacts on official pages; fill `verified_at` in `backend/data/resources.json` | Arya + Radit | Fri 30 Oct |
| O5 | Review the crisis keyword list (English + Indonesian, slang; notes may be in either language); fill `reviewed_by` / `reviewed_on`; then `npm run db:seed-safety`. Crisis detection is off until this is done | Team (+ a counselling contact if possible) | Fri 30 Oct |
| O6 | Confirm the final demo date and practicum session dates; adjust PROJECT-PLAN | Arya | Fri 23 Oct |
