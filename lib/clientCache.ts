"use client";

interface CacheEntry<T> { data: T; timestamp: number; ttlMs: number }
export interface CacheOptions { ttlMs?: number; forceRefresh?: boolean }
const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 100;
let sessionScope = "anonymous";
export function setClientCacheScope(identity: string | null): void {
  const next = identity || "anonymous";
  if (next !== sessionScope) { invalidateClientCache(); sessionScope = next; }
}
function scopeKey(key: string): string { return `${sessionScope}::${key}`; }

function isValidCachePayload(data: unknown): boolean {
  return data !== null && data !== undefined && !(typeof data === "object" && "success" in data && data.success === false);
}

/** Deduplicate requests; invalidated requests cannot overwrite newer results. */
export async function fetchCached<T>(key: string, fetcher: () => Promise<T>, { ttlMs = 60_000, forceRefresh = false }: CacheOptions = {}): Promise<T> {
  const scoped = scopeKey(key);
  if (!forceRefresh) {
    const cached = readEntry<T>(key);
    if (cached !== null) return cached;
  }
  const pending = inFlightRequests.get(scoped);
  if (pending) return pending as Promise<T>;

  const request = Promise.resolve().then(fetcher).then(result => {
    if (inFlightRequests.get(scoped) === request) {
      if (isValidCachePayload(result)) setCachedData(key, result, ttlMs);
      else memoryCache.delete(scoped);
    }
    return result;
  }).finally(() => {
    if (inFlightRequests.get(scoped) === request) inFlightRequests.delete(scoped);
  });
  inFlightRequests.set(scoped, request);
  return request;
}

function readEntry<T>(key: string): T | null {
  const scoped = scopeKey(key);
  const entry = memoryCache.get(scoped);
  if (!entry) return null;
  if (Date.now() - entry.timestamp >= entry.ttlMs || !isValidCachePayload(entry.data)) {
    memoryCache.delete(scoped);
    return null;
  }
  return entry.data as T;
}

export function getCachedData<T>(key: string): T | null {
  return typeof window === "undefined" ? null : readEntry<T>(key);
}

export function setCachedData<T>(key: string, data: T, ttlMs = 60_000): void {
  if (!isValidCachePayload(data)) return;
  const scoped = scopeKey(key);
  memoryCache.delete(scoped);
  memoryCache.set(scoped, { data, timestamp: Date.now(), ttlMs });
  if (memoryCache.size > MAX_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
}

/** Clear only the requested prefix, preserving unrelated pending work. */
export function invalidateClientCache(prefix?: string): void {
  for (const key of new Set([...memoryCache.keys(), ...inFlightRequests.keys()])) {
    if (!prefix || key.startsWith(scopeKey(prefix))) {
      memoryCache.delete(key);
      inFlightRequests.delete(key);
    }
  }
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("miqat:mutation", () => invalidateClientCache());
}
