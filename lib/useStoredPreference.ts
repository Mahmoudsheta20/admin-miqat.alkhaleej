"use client";
import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("miqat-preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("miqat-preferences", callback);
  };
}
export function useStoredPreference(key: string, fallback: string) {
  return useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }, () => fallback);
}
export function setStoredPreference(key: string, value: string) {
  localStorage.setItem(key, value);
  window.dispatchEvent(new Event("miqat-preferences"));
}
