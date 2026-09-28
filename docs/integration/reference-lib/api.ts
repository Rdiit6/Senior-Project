// frontend/src/lib/api.ts
// THE ONLY FILE THAT CALLS THE BACKEND. Components import `api` from here and never call fetch.
// Every request and response type comes from shared/contract.ts, so a wrong field is a compile error.
import type {
  ApiErrorResponse,
  CheckinRequest,
  EndpointKey,
  Endpoints,
  SyncItem,
} from '../../../shared/contract';
import { getAnonToken } from './anonToken';

// Set in frontend/.env.local (local) and in the Static Web Apps build settings (Azure).
// Read inside a function so tests can change it; Next.js still inlines it at build time.
const baseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/** The server answered with an error (4xx/5xx). `code` comes from the contract's ApiErrorCode. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: { index?: number },
  ) {
    super(message);
  }
}

/** The request never reached the server (offline, DNS, CORS). Check-ins go to the offline queue. */
export class NetworkError extends Error {}

async function request<K extends EndpointKey>(
  key: K,
  body?: Endpoints[K]['request'],
): Promise<Endpoints[K]['response']> {
  const [method, path] = key.split(' ');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key !== 'GET /api/resources') headers['X-Anon-Token'] = getAnonToken(); // resources needs no token

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new NetworkError('Could not reach the MindMeter server.');
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ApiErrorResponse | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'INTERNAL_ERROR', err?.message ?? `HTTP ${res.status}`, err?.details);
  }
  return data as Endpoints[K]['response'];
}

export const api = {
  submitCheckin: (body: CheckinRequest) => request('POST /api/checkins', body),
  syncCheckins: (items: SyncItem[]) => request('POST /api/checkins/sync', items),
  listCheckins: () => request('GET /api/checkins'),
  getInsights: () => request('GET /api/insights'),
  getResources: () => request('GET /api/resources'),
};
