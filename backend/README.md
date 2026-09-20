# MindMeter — Backend

Azure-hosted REST API, rule-based AI logic, and database layer for MindMeter.

## What lives here

| Path | Purpose |
|------|---------|
| `src/api/` | Route handlers — checkins, insights, resources endpoints |
| `src/logic/` | Rule-based trend detection (Stage 1 AI) — threshold & streak logic on mood data |
| `src/models/` | Database schema / ORM models — check-ins, anonymous users, resources |

## Endpoints (draft)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/checkins` | Save a mood check-in (note optional) |
| GET  | `/api/checkins` | List current user's check-ins |
| GET  | `/api/insights` | Return trend insight from rule-based logic |
| GET  | `/api/resources` | List support / self-help resources |

See [`/docs/index.md`](../docs/index.md) for full request/response shapes.

## Stage 1 — Rule-based AI

Trend logic lives in `src/logic/`. No model training — pure threshold rules on
`mood_value + created_at` time series (e.g. 7-day average, N consecutive low days).

## Stage 2 — NLP (stretch)

When Stage 1 is stable: `note_text` is sent server-side to a pre-trained
Azure AI Language service. Returns `sentiment + themes`. No training data required.

## Crisis rule

Runs **before** any AI output. If crisis keywords are found in `note_text`,
`crisis_flag: true` is returned and the client shows the human support screen unconditionally.

## Tech stack

> _Team decision pending — update this section once the stack is locked._

## Getting started

```bash
npm install
npm run dev
```

## Deployment

Deployed to the department **Microsoft Azure** account via the `deploy-azure` job in `.github/workflows/ci.yml` (fires only on push to `main`, requires the `AZURE_CREDENTIALS` repo secret).
