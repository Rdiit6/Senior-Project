/**
 * MindMeter API contract — the single source of truth for every request and response.
 *
 * RULES (see docs/MindMeter_Development_Plan.pdf):
 *  - Types only. No runtime code, so importing this file can never break a build.
 *  - Frontend: `import type { ... } from '<path>/shared/contract'`, used ONLY in frontend/src/lib/api.ts.
 *  - Backend (JavaScript) is checked against these types automatically:
 *    backend/tests/integration/api.test.js type-checks real API responses against this file in CI.
 *  - Changing this file = a `contract-change` PR that also changes the backend and its tests,
 *    approved by both the backend and frontend owners.
 */

// ---------------------------------------------------------------- shared building blocks

/** UUID string, e.g. "8a2949fe-c193-44ec-b371-db56052d4839". */
export type Uuid = string;

/** ISO 8601 timestamp, e.g. "2026-09-28T20:00:00+07:00". */
export type IsoDateTime = string;

/** One tap on the mood scale: 1 = very low ... 5 = very good. */
export type MoodValue = 1 | 2 | 3 | 4 | 5;

/** Fixed theme vocabulary (the `themes` table). Used in Insight.themes and Resource.tags. */
export type ThemeCode =
  | 'sleep'
  | 'workload'
  | 'exams'
  | 'isolation'
  | 'relationships'
  | 'finance'
  | 'health'
  | 'motivation';

export type Trend = 'stable' | 'declining' | 'improving';

/** A support contact or self-help resource. The primary crisis contact always comes first. */
export interface Resource {
  id: Uuid;
  title: string;
  description: string;
  /** "https://..." for websites, or "tel:+62..." for phone-only contacts. */
  url: string;
  tags: ThemeCode[];
}

// ---------------------------------------------------------------- identity + browser storage

/**
 * Every /api request except GET /api/resources must send this header.
 * Value: crypto.randomUUID(), created once and kept in localStorage.
 */
export type AnonTokenHeader = 'X-Anon-Token';

/** The only localStorage keys MindMeter uses. Never rename them. */
export type StorageKey = 'mindmeter_anon_token' | 'mindmeter_sync_queue';

/** Shape stored under localStorage['mindmeter_sync_queue'] while offline. */
export type SyncQueue = SyncItem[];

// ---------------------------------------------------------------- POST /api/checkins

export interface CheckinRequest {
  mood_value: MoodValue;
  /** Optional, at most 200 characters. Blank text counts as no note. */
  note_text?: string | null;
  /** When the tap happened. Omit for a live check-in; the server uses its own time. */
  client_ts?: IsoDateTime | null;
}

/** Normal check-in: a gentle rule-based insight comes back. */
export interface CheckinSaved {
  id: Uuid;
  saved: true;
  insight: string;
  crisis_flag: false;
}

/** The note matched a crisis keyword: NO insight. Show the support screen immediately. */
export interface CheckinCrisis {
  id: Uuid;
  saved: true;
  crisis_flag: true;
}

/** Check `crisis_flag` first; TypeScript then knows whether `insight` exists. */
export type CheckinResponse = CheckinSaved | CheckinCrisis;

// ---------------------------------------------------------------- POST /api/checkins/sync

/** A check-in that was queued offline. `client_ts` is required here. */
export interface SyncItem {
  mood_value: MoodValue;
  note_text?: string | null;
  client_ts: IsoDateTime;
}

/** 1 to 50 items. Re-sending the same items is safe (the newer tap for a day wins). */
export type SyncRequest = SyncItem[];

export interface SyncResult {
  /** Echoed exactly as sent, so the client can match results to its queue. */
  client_ts: IsoDateTime;
  id: Uuid;
  /** true = remove this item from the local queue. */
  saved: boolean;
  /** true = show the support screen. */
  crisis_flag: boolean;
}

/** Same order as the request. */
export type SyncResponse = SyncResult[];

// ---------------------------------------------------------------- GET /api/checkins

export interface CheckinListItem {
  id: Uuid;
  mood_value: MoodValue;
  note_text: string | null;
  created_at: IsoDateTime;
}

/** Last 90 days, oldest first, one item per WIB day. Empty array = show the empty state. */
export type CheckinListResponse = CheckinListItem[];

// ---------------------------------------------------------------- GET /api/insights

export interface InsightResponse {
  trend: Trend;
  /** Plain-language Indonesian sentence to show as-is. */
  message: string;
  /** Themes found in this week's notes (empty until Stage 2 NLP is switched on). */
  themes: ThemeCode[];
  /** Up to 3 matched resources. May be empty. */
  resources: Resource[];
}

// ---------------------------------------------------------------- GET /api/resources

/** Works WITHOUT X-Anon-Token, so the support screen always loads. */
export type ResourcesResponse = Resource[];

// ---------------------------------------------------------------- errors (any 4xx / 5xx)

export type ApiErrorCode =
  | 'VALIDATION_ERROR' // 400: bad body; `message` says what is wrong
  | 'INVALID_JSON' // 400
  | 'ANON_TOKEN_REQUIRED' // 401: missing or invalid X-Anon-Token
  | 'NOT_FOUND' // 404
  | 'BODY_TOO_LARGE' // 413
  | 'INTERNAL_ERROR'; // 500: show a gentle retry message

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Sync validation errors include { index } of the bad item. */
    details?: { index?: number };
  };
}

// ---------------------------------------------------------------- endpoint map

/** One entry per endpoint. frontend/src/lib/api.ts types every call from this map. */
export interface Endpoints {
  'POST /api/checkins': { request: CheckinRequest; response: CheckinResponse; needsToken: true };
  'POST /api/checkins/sync': { request: SyncRequest; response: SyncResponse; needsToken: true };
  'GET /api/checkins': { request: undefined; response: CheckinListResponse; needsToken: true };
  'GET /api/insights': { request: undefined; response: InsightResponse; needsToken: true };
  'GET /api/resources': { request: undefined; response: ResourcesResponse; needsToken: false };
}

export type EndpointKey = keyof Endpoints;
