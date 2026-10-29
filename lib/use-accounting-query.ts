"use client";
import { useEffect, useState } from "react";
import { accountingRequest } from "./accounting";
export function useAccountingQuery<T>(path: string, reload = 0) {
  const [state, setState] = useState<{ data: T | null; error: string; isLoading: boolean }>({ data: null, error: "", isLoading: true });
  useEffect(() => {
    let active = true;
    async function load() {
      setState({ data: null, error: "", isLoading: true });
      const result = await accountingRequest<T>(path);
      if (active) setState({ data: result.data || null, error: result.error || "", isLoading: false });
    }
    void load(); return () => { active = false; };
  }, [path, reload]);
  return state;
}
