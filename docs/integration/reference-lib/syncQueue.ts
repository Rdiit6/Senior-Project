// frontend/src/lib/syncQueue.ts
// Offline check-ins. If the network is down, the check-in is queued in localStorage and sent
// later with POST /api/checkins/sync. Re-sending is safe: the server keeps the newer tap per day.
import type {
  CheckinRequest,
  CheckinResponse,
  StorageKey,
  SyncItem,
  SyncQueue,
  SyncResponse,
} from '../../../shared/contract';
import { api, ApiError, NetworkError } from './api';

const KEY: StorageKey = 'mindmeter_sync_queue';
const BATCH = 50; // backend limit per sync call
const MAX_AGE_MS = 29 * 24 * 60 * 60 * 1000; // backend rejects items older than 30 days

export function readQueue(): SyncQueue {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as SyncQueue) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: SyncQueue): void {
  localStorage.setItem(KEY, JSON.stringify(queue));
}

/** What the check-in screen gets back. */
export type SubmitOutcome =
  | { kind: 'saved'; response: CheckinResponse } // check response.crisis_flag first!
  | { kind: 'queued' }; // offline: show "Tersimpan — akan dikirim saat online"

/** Use this from the check-in screen instead of api.submitCheckin. */
export async function submitOrQueue(body: CheckinRequest): Promise<SubmitOutcome> {
  try {
    return { kind: 'saved', response: await api.submitCheckin(body) };
  } catch (err) {
    if (!(err instanceof NetworkError)) throw err; // a real 4xx/5xx: show the error, do not queue
    const item: SyncItem = {
      mood_value: body.mood_value,
      note_text: body.note_text ?? null,
      client_ts: new Date().toISOString(), // when the student actually tapped
    };
    writeQueue([...readQueue(), item]);
    return { kind: 'queued' };
  }
}

let flushing = false;

/**
 * Sends the queue. Returns crisis=true if any queued note was a crisis note:
 * the caller must then show the support screen.
 */
export async function flushQueue(): Promise<{ sent: number; crisis: boolean }> {
  if (flushing) return { sent: 0, crisis: false };
  flushing = true;
  let sent = 0;
  let crisis = false;
  try {
    // Drop items the server would refuse for being too old, so the queue can never get stuck.
    let queue = readQueue().filter((i) => Date.now() - new Date(i.client_ts).getTime() < MAX_AGE_MS);
    writeQueue(queue);

    while (queue.length > 0) {
      const batch = queue.slice(0, BATCH);
      let results: SyncResponse;
      try {
        results = await api.syncCheckins(batch);
      } catch (err) {
        // One invalid item fails the whole batch; the server says which one. Drop it and retry.
        if (err instanceof ApiError && err.status === 400 && err.details?.index !== undefined) {
          queue = queue.filter((_, i) => i !== err.details?.index);
          writeQueue(queue);
          continue;
        }
        throw err; // offline again or server error: keep the queue for next time
      }
      const done = new Set(results.filter((r) => r.saved).map((r) => r.client_ts));
      crisis = crisis || results.some((r) => r.crisis_flag);
      sent += done.size;
      queue = readQueue().filter((i) => !done.has(i.client_ts));
      writeQueue(queue);
    }
  } catch (err) {
    if (!(err instanceof NetworkError)) console.error('[sync]', err);
  } finally {
    flushing = false;
  }
  return { sent, crisis };
}

/** Call once from the root layout: syncs on page load and whenever the browser comes back online. */
export function startAutoSync(onCrisis: () => void): () => void {
  const run = () => flushQueue().then((r) => r.crisis && onCrisis());
  run();
  window.addEventListener('online', run);
  return () => window.removeEventListener('online', run);
}
