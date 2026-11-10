"use client";

import { useSyncExternalStore } from "react";

export const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";

function subscribe(callback: () => void): () => void {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => {};
  }

  const mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);
  const handleChange = () => callback();

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }

  mediaQuery.addListener(handleChange);
  return () => mediaQuery.removeListener(handleChange);
}

function getSnapshot(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Tracks whether the viewport is under 768px (`(max-width: 767px)`).
 * Uses `useSyncExternalStore` with `false` on SSR to avoid hydration mismatch.
 */
export function useIsMobileViewport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

