"use client";

import { useEffect, useState } from "react";

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
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<PdfDocumentResult | null>(null);
  const key = JSON.stringify([sourceUrl, token, reloadKey]);
  const current = result?.key === key ? result : null;

  useEffect(() => {
    if (!sourceUrl) return;
    let isActive = true;
    let objectUrl: string | null = null;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 120_000);
    async function load(url: string) {
      try {
        const response = await fetch(url, {
          headers: isAuthenticated && token ? { Authorization: `Bearer ${token}` } : {},
          credentials: isAuthenticated ? "include" : "omit",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403
          ? "يرجى تسجيل الدخول مجدداً للتحقق من صلاحية عرض الملف."
          : "تعذر تحميل ملف PDF. يرجى إعادة المحاولة.");
        const blob = await response.blob();
        if (await blob.slice(0, 5).text() !== "%PDF-") throw new Error("لم يُرجع الخادم ملف PDF صالحاً.");
        if (!isActive) return;
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setResult({ key, url: objectUrl, error: null });
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
  }, [sourceUrl, token, isAuthenticated, key]);

  return {
    url: current?.url ?? null,
    error: current?.error ?? null,
    isLoading: Boolean(sourceUrl) && !current,
    refresh: () => setReloadKey(value => value + 1),
  };
}
