# MindMeter — Frontend

Browser-side UI for the MindMeter student self-reflection app.

## What lives here

| Path | Purpose |
|------|---------|
| `src/` | Application source — components, pages, styles, API calls |
| `public/` | Static assets served as-is (favicon, manifest, images) |

## Responsibilities

- One-tap daily mood check-in (mood value 1–5 + optional note ≤ 200 chars)
- Personal trend dashboard — mood chart + plain-language insight + resource cards
- Crisis/support screen — always accessible, bypasses AI output
- Calls the backend REST API (`/api/checkins`, `/api/insights`, `/api/resources`)

## Tech stack

> _Team decision pending — update this section once the stack is locked._

## Getting started

```bash
npm install
npm run dev
```

## API contract

See [`/docs/index.md`](../docs/index.md) for the agreed API spec.
