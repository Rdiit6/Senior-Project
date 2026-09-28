# Frontend reference lib

Tested reference code for the frontend's connection to the backend. See `docs/MindMeter_Integration_Guide.pdf`, pages 11–13.

After scaffolding the Next.js app in `frontend/`, copy these three files into `frontend/src/lib/`:

| File | What it does |
|------|--------------|
| `api.ts` | The **only** file that calls the backend. Every call is typed from `shared/contract.ts`. |
| `anonToken.ts` | Creates and stores the anonymous UUID sent as `X-Anon-Token`. |
| `syncQueue.ts` | Offline check-ins: `submitOrQueue()` for the check-in screen, `startAutoSync()` for the root layout. |

The imports (`../../../shared/contract`) are written for `frontend/src/lib/`, so they only resolve after copying.

Verified before committing:
- `tsc --strict` passes (and rejects reading `insight` without checking `crisis_flag`, or a mood of 6).
- 11/11 checks against the live backend: resources without a token, normal check-in, crisis check-in,
  offline queueing, flush while still offline, flush when back online, crisis note from the queue, bad token → 401.

Local setup: run the frontend on port 3001 (`npm run dev -- -p 3001`) with
`NEXT_PUBLIC_API_URL=http://localhost:3000` in `frontend/.env.local`.
