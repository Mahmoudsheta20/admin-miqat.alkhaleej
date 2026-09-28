"use client";

import { useEffect, useState } from "react";
import { resolvePdfSource } from "./pdf-source";

interface PdfDocumentOptions {
  sourceUrl: string | null;
  token?: string | null;
  isAuthenticated: boolean;
}

interface PdfDocumentResult {
  key: string;
  url: string | null;
  error: string | null;
}

export function usePdfDocument({ sourceUrl, token, isAuthenticated }: PdfDocumentOptions) {
  const [forceBuffer, setForceBuffer] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<PdfDocumentResult | null>(null);
  const key = JSON.stringify([sourceUrl, token, reloadKey, forceBuffer]);
  const current = result?.key === key ? result : null;

  useEffect(() => {
    if (!sourceUrl) return;
    let isActive = true;
    let objectUrl: string | null = null;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 120_000);
    async function load(url: string) {
      try {
        const document = await resolvePdfSource({ sourceUrl: url, token, isAuthenticated, forceBuffer, signal: controller.signal });
        if (!isActive) return;
        if (document.blob) objectUrl = URL.createObjectURL(document.blob);
        setResult({ key, url: document.url || objectUrl, error: null });
      } catch (error: unknown) {
        if (!isActive) return;
        setResult({ key, url: null, error: controller.signal.aborted
          ? "انتهت مهلة تحميل الملف. يرجى إعادة المحاولة."
          : error instanceof TypeError ? "تعذر الاتصال بخادم الملفات."
          : error instanceof Error ? error.message : "تعذر تحميل الملف." });
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void load(sourceUrl);
    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(timeout);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceUrl, token, isAuthenticated, key, forceBuffer]);

  return {
    url: current?.url ?? null,
    error: current?.error ?? null,
    isLoading: Boolean(sourceUrl) && !current,
    refresh: () => { setForceBuffer(false); setReloadKey(value => value + 1); },
    useFallback: () => { setForceBuffer(true); setReloadKey(value => value + 1); },
  };
}
