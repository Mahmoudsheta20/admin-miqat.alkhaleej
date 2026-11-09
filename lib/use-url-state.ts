"use client";
import { useCallback, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
const URL_EVENT = "miqat:url-state";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(URL_EVENT, callback);
  return () => { window.removeEventListener("popstate", callback); window.removeEventListener(URL_EVENT, callback); };
}
function snapshot() { return window.location.search; }
function serverSnapshot() { return ""; }
export function readUrlValue<T extends string | number | boolean>(query: string, key: string, fallback: T, allowed?: readonly T[]): T {
  const raw = new URLSearchParams(query).get(key);
  if (raw === null) return fallback;
  const parsed = typeof fallback === "number" ? (Number.isSafeInteger(Number(raw)) && Number(raw) > 0 && Number(raw) <= 100000 ? Number(raw) : fallback)
    : typeof fallback === "boolean" ? raw === "true" : raw;
  return allowed && !allowed.includes(parsed as T) ? fallback : parsed as T;
}
/** Native history integrates with Next navigation and preserves unrelated query parameters. */
export function useUrlState<T extends string | number | boolean>(key: string, fallback: T, allowed?: readonly T[]): [T, Dispatch<SetStateAction<T>>] {
  const query = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const value = readUrlValue(query, key, fallback, allowed);
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(next => {
    const url = new URL(window.location.href);
    const previous = readUrlValue(url.search, key, fallback, allowed);
    const resolved = typeof next === "function" ? next(previous) : next;
    if (resolved === fallback) url.searchParams.delete(key); else url.searchParams.set(key, String(resolved));
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new Event(URL_EVENT));
  }, [key, fallback, allowed]);
  return [value, setValue];
}
