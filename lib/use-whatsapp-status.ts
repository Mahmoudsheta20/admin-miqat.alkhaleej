"use client";

import { useEffect } from "react";
import { useApiQuery } from "./use-api-query";
import type { WhatsAppStatus } from "./whatsapp";

/** Session-scoped status shared by the settings page and send dialogs. */
export function useWhatsAppStatus() {
  const query = useApiQuery<Omit<WhatsAppStatus, "success">>("/whatsapp/status");
  const { isFetching, refetch } = query;
  const interval = query.data?.status === "connected" || query.data?.antiBan?.haltReason ? 15000 : 3000;
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !isFetching) refetch();
    }, interval);
    return () => clearInterval(timer);
  }, [interval, isFetching, refetch]);
  const stats = query.data?.antiBan;
  const dailyAvailable = !stats || (stats.attemptedLast24Hours ?? stats.sentLast24Hours) < stats.dailyLimit;
  return { ...query, canSend: query.data?.status === "connected" && !stats?.haltReason && !query.error && dailyAvailable };
}
