# MindMeter API Reference

Per-endpoint examples to copy into frontend mocks and backend tests. Types and rules: [API-CONTRACT.md](./API-CONTRACT.md) and [`shared/contract.ts`](../shared/contract.ts) (these win if anything here differs).

```bash
BASE=http://localhost:3000
TOKEN=3f1c2a0e-8d2b-4c58-9a77-5d6f0e1b9c11   # any UUID; send it on every call except /api/resources
```

---

## E1 `POST /api/checkins`

Header `X-Anon-Token` required. Always **200**.

Request (`CheckinRequest`):
```json
{ "mood_value": 3, "note_text": "Too much coursework this week", "client_ts": null }
```
`note_text` and `client_ts` are optional.

```bash
curl -s -X POST $BASE/api/checkins -H "Content-Type: application/json" \
  -H "X-Anon-Token: $TOKEN" -d '{"mood_value":3,"note_text":"Too much coursework this week"}'
```

Normal response (`CheckinSaved`):
```json
{ "id": "8a2949fe-c193-44ec-b371-db56052d4839", "saved": true,
  "insight": "Check in a few more days to see your mood pattern.",
  "crisis_flag": false }
```

Crisis response (`CheckinCrisis`, **no `insight` field**): show the support screen.
```json
{ "id": "8a2949fe-c193-44ec-b371-db56052d4839", "saved": true, "crisis_flag": true }
```

Errors: 400 `VALIDATION_ERROR` (mood outside 1–5, note over 200 characters, bad `client_ts`), 400 `INVALID_JSON`, 401 `ANON_TOKEN_REQUIRED`, 413 `BODY_TOO_LARGE`.

---

## E2 `POST /api/checkins/sync`

Replays the offline queue. Body is a **bare JSON array** (1–50 items), `client_ts` required on each.

```bash
curl -s -X POST $BASE/api/checkins/sync -H "Content-Type: application/json" \
  -H "X-Anon-Token: $TOKEN" \
  -d '[{"mood_value":2,"note_text":null,"client_ts":"2026-10-19T08:00:00+07:00"},
       {"mood_value":4,"client_ts":"2026-10-20T21:10:00+07:00"}]'
```

Response (`SyncResponse`, same order as the request):
```json
[
  { "client_ts": "2026-10-19T08:00:00+07:00", "id": "…uuid…", "saved": true, "crisis_flag": false },
  { "client_ts": "2026-10-20T21:10:00+07:00", "id": "…uuid…", "saved": true, "crisis_flag": false }
]
```
Remove every `saved: true` item from `mindmeter_sync_queue`. If any `crisis_flag` is true, show the support screen.

Invalid item (whole request rejected, nothing saved):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "mood_value must be an integer from 1 to 5",
             "details": { "index": 1 } } }
```
Drop item `index` from the queue and retry the rest.

---

## E3 `GET /api/checkins`

```bash
curl -s $BASE/api/checkins -H "X-Anon-Token: $TOKEN"
```

Response (`CheckinListResponse`): last 90 days, oldest first, one per WIB day.
```json
[
  { "id": "…uuid…", "mood_value": 2, "note_text": null, "created_at": "2026-10-19T08:00:00+07:00" },
  { "id": "…uuid…", "mood_value": 4, "note_text": "Feeling calmer", "created_at": "2026-10-20T21:10:00+07:00" }
]
```
New user: `[]` (empty state, not an error).

---

## E4 `GET /api/insights`

```bash
curl -s $BASE/api/insights -H "X-Anon-Token: $TOKEN"
```

Response (`InsightResponse`):
```json
{
  "trend": "declining",
  "message": "Your mood has been trending low for the past few days.",
  "themes": ["workload", "sleep"],
  "resources": [
    { "id": "…uuid…", "title": "Campus Counselling Service", "description": "Free counselling for students.",
      "url": "https://example.ac.id/konseling", "tags": ["workload"] }
  ]
}
```
`trend` is `stable`, `declining` or `improving`. Not enough data (under 3 check-ins in 7 days) returns `stable` with a "keep checking in" message. `themes` is `[]` until NLP is enabled. `resources` has at most 3 items and may be empty. Message text above is illustrative (English); show whatever the server returns.

---

## E5 `GET /api/resources` (no token)

```bash
curl -s $BASE/api/resources
```

Response (`ResourcesResponse`): primary crisis contact first.
```json
[
  { "id": "…uuid…", "title": "Crisis Hotline", "description": "Immediate help, 24 hours.",
    "url": "tel:+62000000000", "tags": [] }
]
```
`url` starting with `tel:` should render as a call button.

---

## Errors (all endpoints)

```json
{ "error": { "code": "ANON_TOKEN_REQUIRED", "message": "X-Anon-Token header is required." } }
```
Codes: `VALIDATION_ERROR` 400, `INVALID_JSON` 400, `ANON_TOKEN_REQUIRED` 401, `NOT_FOUND` 404, `BODY_TOO_LARGE` 413, `INTERNAL_ERROR` 500. Behaviour per code: [API-CONTRACT §7](./API-CONTRACT.md#7-errors).

## Frontend mock tips

- Build mocks from the JSON above and type them with `import type { ... } from 'shared/contract'` inside `src/lib/api.ts` only.
- Mock at least: normal, crisis, empty list, sync success, sync with a bad item, network failure, 401.
- The tested reference implementation is in `docs/integration/reference-lib/`; copy it rather than rewriting the token and queue logic.

## Health check (not for the frontend)

`GET /health` → 200, used by Azure App Service.
