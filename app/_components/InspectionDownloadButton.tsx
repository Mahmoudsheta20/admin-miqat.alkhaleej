"use client";

import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadInspectionPdf } from "@/lib/download-pdf";

interface InspectionDownloadButtonProps { inspectionId: string }

export default function InspectionDownloadButton({ inspectionId }: InspectionDownloadButtonProps) {
  const pending = useRef(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    if (pending.current) return;
    pending.current = true;
    setIsDownloading(true);
    setError("");
    try { await downloadInspectionPdf(inspectionId); }
    catch (error: unknown) {
      setError(error instanceof Error && error.name === "TimeoutError"
        ? "استغرق تجهيز الفحص وقتاً طويلاً. يرجى إعادة المحاولة."
        : error instanceof Error ? error.message : "تعذر تنزيل الفحص. يرجى إعادة المحاولة.");
    } finally {
      pending.current = false;
      setIsDownloading(false);
    }
  }

  return <div className="w-full sm:w-auto">
    <button type="button" onClick={handleDownload} disabled={isDownloading} aria-busy={isDownloading}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border theme-border theme-card px-4 py-2.5 text-xs font-bold transition hover:border-amber-500 disabled:opacity-60 sm:w-auto">
      {isDownloading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}
      {isDownloading ? "جاري تنزيل الفحص..." : "تنزيل الفحص PDF"}
    </button>
    {error && <p role="alert" className="mt-2 max-w-sm text-xs text-rose-700 dark:text-rose-300">{error}</p>}
  </div>;
}
