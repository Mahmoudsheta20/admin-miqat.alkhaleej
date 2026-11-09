"use client";
import { useApiQuery } from "./use-api-query";
export function useAccountingQuery<T>(path: string, reload = 0) {
  return useApiQuery<T>(`/accounting${path}`, reload);
}
