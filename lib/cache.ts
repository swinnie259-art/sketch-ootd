/** Tiny in-process TTL cache so repeated searches don't burn platform API quota. */
type Entry = { value: unknown; expires: number };
const store = new Map<string, Entry>();
const MAX = 500;

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await fn();
  if (store.size >= MAX) store.delete(store.keys().next().value as string);
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

export const HOUR = 60 * 60 * 1000;
