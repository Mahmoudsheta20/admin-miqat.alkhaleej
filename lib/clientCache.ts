"use client";

interface CacheEntry<T> { data: T; timestamp: number; ttlMs: number }
export interface CacheOptions { ttlMs?: number; forceRefresh?: boolean }
const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 100;

function isValidCachePayload(data: unknown): boolean {
  return data !== null && data !== undefined && !(typeof data === "object" && "success" in data && data.success === false);
}

/** Deduplicate requests; invalidated requests cannot overwrite newer results. */
export async function fetchCached<T>(key: string, fetcher: () => Promise<T>, { ttlMs = 60_000, forceRefresh = false }: CacheOptions = {}): Promise<T> {
  if (!forceRefresh) {
    const cached = readEntry<T>(key);
    if (cached !== null) return cached;
  }
  const pending = inFlightRequests.get(key);
  if (pending) return pending as Promise<T>;

  const request = Promise.resolve().then(fetcher).then(result => {
    if (inFlightRequests.get(key) === request) {
      if (isValidCachePayload(result)) setCachedData(key, result, ttlMs);
      else memoryCache.delete(key);
    }
    return result;
  }).finally(() => {
    if (inFlightRequests.get(key) === request) inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, request);
  return request;
}

function readEntry<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp >= entry.ttlMs || !isValidCachePayload(entry.data)) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function getCachedData<T>(key: string): T | null {
  return typeof window === "undefined" ? null : readEntry<T>(key);
}

export function setCachedData<T>(key: string, data: T, ttlMs = 60_000): void {
  if (!isValidCachePayload(data)) return;
  memoryCache.delete(key);
  memoryCache.set(key, { data, timestamp: Date.now(), ttlMs });
  if (memoryCache.size > MAX_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
}

/** Clear only the requested prefix, preserving unrelated pending work. */
export function invalidateClientCache(prefix?: string): void {
  for (const key of new Set([...memoryCache.keys(), ...inFlightRequests.keys()])) {
    if (!prefix || key.startsWith(prefix)) {
      memoryCache.delete(key);
      inFlightRequests.delete(key);
    }
  }
}
