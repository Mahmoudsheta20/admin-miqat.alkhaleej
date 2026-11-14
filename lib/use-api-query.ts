"use client";
import { useCallback, useEffect, useState } from "react";
import { backendRequest } from "./backend";
import { fetchCached, invalidateClientCache } from "./clientCache";
interface QueryState<T> { identity: string; path: string; data: T | null; error: string; isLoading: boolean; status?: number }
export function useApiQuery<T>(path: string | null, revision = 0) {
  const [generation, setGeneration] = useState(0);
  const identity = path ? `${path}:${revision}:${generation}` : "__disabled__";
  const [state, setState] = useState<QueryState<T>>({ identity: "", path: "", data: null, error: "", isLoading: Boolean(path) });
  const key = path ? `api:${path}` : "";
  useEffect(() => {
    if (!path) return;
    let active = true;
    void fetchCached(key, () => backendRequest<T>(path), { forceRefresh: revision > 0 || generation > 0 }).then(result => {
      if (!active) return;
      setState(prev => {
        const keepPrevious =
          prev.path === path && result.status !== 401 && result.status !== 403;
        return {
          identity,
          path,
          data: result.success ? (result.data ?? null) : keepPrevious ? prev.data : null,
          error: result.error || "",
          isLoading: false,
          status: result.status,
        };
      });
    }).catch((error: unknown) => {
      if (!active) return;
      const fallbackError =
        typeof document !== "undefined" && document.documentElement.lang === "en"
          ? "Unable to load data"
          : "تعذر تحميل البيانات";
      setState(prev => ({
        identity,
        path,
        data: prev.path === path ? prev.data : null,
        error: error instanceof Error ? error.message : fallbackError,
        isLoading: false,
        status: prev.path === path ? prev.status : undefined,
      }));
    });
    return () => { active = false; };
  }, [identity, key, path, revision, generation]);
  const refetch = useCallback(() => {
    if (!key) return;
    invalidateClientCache(key);
    setGeneration(value => value + 1);
  }, [key]);
  useEffect(() => {
    if (!path) return;
    window.addEventListener("miqat:mutation", refetch);
    return () => window.removeEventListener("miqat:mutation", refetch);
  }, [path, refetch]);
  if (!path) {
    return {
      data: null as T | null,
      error: "",
      isLoading: false,
      isFetching: false,
      status: undefined as number | undefined,
      refetch,
    };
  }
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
