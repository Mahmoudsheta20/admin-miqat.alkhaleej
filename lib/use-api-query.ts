"use client";
import { useCallback, useEffect, useState } from "react";
import { backendRequest } from "./backend";
import { fetchCached, invalidateClientCache } from "./clientCache";
interface QueryState<T> { identity: string; path: string; data: T | null; error: string; isLoading: boolean; status?: number }
export function useApiQuery<T>(path: string, revision = 0) {
  const [generation, setGeneration] = useState(0);
  const identity = `${path}:${revision}:${generation}`;
  const [state, setState] = useState<QueryState<T>>({ identity: "", path: "", data: null, error: "", isLoading: true });
  const key = `api:${path}`;
  useEffect(() => {
    let active = true;
    void fetchCached(key, () => backendRequest<T>(path), { forceRefresh: revision > 0 || generation > 0 }).then(result => {
      if (active) setState({ identity, path, data: result.success ? result.data ?? null : null, error: result.error || "", isLoading: false, status: result.status });
    }).catch((error: unknown) => {
      if (active) setState({ identity, path, data: null, error: error instanceof Error ? error.message : "تعذر تحميل البيانات", isLoading: false });
    });
    return () => { active = false; };
  }, [identity, key, path, revision, generation]);
  const refetch = useCallback(() => { invalidateClientCache(key); setGeneration(value => value + 1); }, [key]);
  useEffect(() => { window.addEventListener("miqat:mutation", refetch); return () => window.removeEventListener("miqat:mutation", refetch); }, [refetch]);
  const isCurrent = state.identity === identity;
  const isSamePath = state.path === path;
  if (isCurrent) {
    return { data: state.data, error: state.error, isLoading: state.isLoading, isFetching: false, status: state.status, refetch };
  }
  return {
    data: isSamePath ? state.data : null,
    error: isSamePath ? state.error : "",
    isLoading: !isSamePath || state.data === null,
    isFetching: true,
    status: isSamePath ? state.status : undefined,
    refetch,
  };
}
