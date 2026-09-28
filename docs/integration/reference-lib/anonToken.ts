// frontend/src/lib/anonToken.ts
// The student's anonymous identity: a random UUID created once and kept in localStorage.
// The backend stores only a hash of it. Never send it anywhere except the X-Anon-Token header.
import type { StorageKey } from '../../../shared/contract';

const KEY: StorageKey = 'mindmeter_anon_token';

export function getAnonToken(): string {
  let token = localStorage.getItem(KEY);
  if (!token) {
    token = crypto.randomUUID(); // 36 chars, matches the backend's /^[A-Za-z0-9_-]{16,128}$/
    localStorage.setItem(KEY, token);
  }
  return token;
}
