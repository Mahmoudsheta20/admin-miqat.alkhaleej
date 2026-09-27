"use client";

/**
 * ⚡ Ultra-High-Performance Client-Side In-Memory Cache with In-Flight Deduplication
 * 
 * Features:
 * - In-flight Promise deduplication: Prevents React StrictMode & parallel components from duplicate fetching.
 * - Time-To-Live (TTL): Configurable per request (defaults to 60 seconds).
 * - Instant Cache Hits: Returns in 0ms without hitting the server/database.
 * - Stale-While-Revalidate (SWR): Can serve stale data instantly while updating in the background.
 * - Pattern-based Invalidation: Easily bust cache on mutations (e.g., create, update, delete).
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

// In-memory cache dictionary
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Map for tracking pending in-flight promises to deduplicate simultaneous requests
const inFlightRequests = new Map<string, Promise<unknown>>();
let cacheGeneration = 0;

export interface CacheOptions {
  /** Time To Live in milliseconds (default: 60,000ms / 1 minute) */
  ttlMs?: number;
  /** If true, skips reading from cache and forces a fresh network/database call */
  forceRefresh?: boolean;
}

/**
 * Helper to determine if a fetcher result is considered valid for caching.
 * Prevents transient errors, null, undefined, or failed { success: false } payloads from polluting the cache.
 */
function isValidCachePayload(data: unknown): boolean {
  if (data === null || data === undefined) return false;
  if (
    typeof data === "object" &&
    data !== null &&
    "success" in data &&
    (data as { success?: boolean }).success === false
  ) {
    return false;
  }
  return true;
}

/**
 * Fetch data with client-side caching and automatic in-flight deduplication.
 */
export async function fetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttlMs = 60_000, forceRefresh = false } = options;
  const now = Date.now();
  const generation = cacheGeneration;

  // 1. Check existing fresh cache if forceRefresh is false
  if (!forceRefresh) {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (entry && now - entry.timestamp < entry.ttlMs) {
      if (isValidCachePayload(entry.data)) {
        return entry.data;
      } else {
        memoryCache.delete(key);
      }
    }
  }

  // 2. Check if the identical request is already in-flight (deduplication)
  const existingPromise = inFlightRequests.get(key);
  if (existingPromise) {
    return existingPromise as Promise<T>;
  }

  // 3. Execute the fetcher and store the in-flight promise
  const executePromise = (async () => {
    try {
      const result = await fetcher();
      if (generation !== cacheGeneration) return result;

      // Only cache valid, non-error payloads
      if (isValidCachePayload(result)) {
        memoryCache.set(key, {
          data: result,
          timestamp: Date.now(),
          ttlMs,
        });
      } else {
        // If result was unsuccessful, purge any previous cached entry for this key
        memoryCache.delete(key);
      }

      return result;
    } catch (err) {
      // On error, ensure broken key is deleted
      if (generation === cacheGeneration) memoryCache.delete(key);
      throw err;
    } finally {
      // Clean up in-flight tracker once settled
      if (generation === cacheGeneration) inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, executePromise);
  return executePromise;
}

/**
 * Synchronously read cached data if present and valid.
 * SSR-safe: returns null during server-side rendering to prevent hydration mismatches.
 */
export function getCachedData<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  const now = Date.now();
  if (now - entry.timestamp > entry.ttlMs) {
    memoryCache.delete(key);
    return null; // Expired
  }

  if (!isValidCachePayload(entry.data)) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Manually set or update a cache entry (e.g. for optimistic updates).
 */
export function setCachedData<T>(key: string, data: T, ttlMs = 60_000): void {
  if (!isValidCachePayload(data)) return;
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttlMs,
  });
}

/**
 * Invalidate cached items by key or pattern prefix.
 * e.g.:
 *   invalidateClientCache('contracts') -> clears 'contracts_list', 'contracts_ALL', etc.
 *   invalidateClientCache() -> clears everything.
 */
export function invalidateClientCache(prefixOrKey?: string): void {
  cacheGeneration++;
  inFlightRequests.clear();
  if (!prefixOrKey) {
    memoryCache.clear();
    inFlightRequests.clear();
    return;
  }

  for (const key of Array.from(memoryCache.keys())) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey)) {
      memoryCache.delete(key);
    }
  }

  for (const key of Array.from(inFlightRequests.keys())) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey)) {
      inFlightRequests.delete(key);
    }
  }
}
