"use client";

import React, { useMemo, useState, useEffect } from "react";
import { X, Download, ExternalLink, FileText, CheckCircle2, ShieldCheck, AlertCircle, RotateCw } from "lucide-react";
import { backendUrl, getAuthToken } from "@/lib/backend";

interface InspectionPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionId?: string | null;
  captainName?: string;
  vehiclePlate?: string;
  pdfUrl?: string | null;
}

const S3_BUCKET_BASE =
  process.env.NEXT_PUBLIC_S3_BUCKET_URL ||
  "https://miqatalkhaleej.s3.eu-central-1.amazonaws.com";

export default function InspectionPdfPreviewModal({
  isOpen,
  onClose,
  inspectionId,
  captainName = "الكابتن",
  vehiclePlate = "",
  pdfUrl: propPdfUrl,
}: InspectionPdfPreviewModalProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const shortCode = useMemo(() => {
    if (!inspectionId) return "";
    return inspectionId.replace(/-/g, "").slice(0, 8).toUpperCase();
  }, [inspectionId]);

  // 1. Direct official S3 URL (only if explicitly provided with valid url)
  const s3Url = useMemo(() => {
    if (propPdfUrl && (propPdfUrl.startsWith("http://") || propPdfUrl.startsWith("https://"))) {
      return propPdfUrl;
    }
    return null;
  }, [propPdfUrl]);

  // 2. Reliable backend stream URL (generates dynamically on-demand if missing on S3!)
  const streamUrl = useMemo(() => {
    if (!inspectionId) return null;
    const token = getAuthToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
    return backendUrl(`/inspections/${encodeURIComponent(inspectionId)}/pdf?direct=1${tokenParam}`);
  }, [inspectionId]);

  // Prefer direct S3 URL if already known and uploaded; otherwise use backend stream URL
  const effectiveUrl = s3Url || streamUrl;
  const directDownloadUrl = s3Url || (inspectionId ? backendUrl(`/inspections/${encodeURIComponent(inspectionId)}/pdf?download=1${getAuthToken() ? `&token=${encodeURIComponent(getAuthToken()!)}` : ""}`) : null);

  useEffect(() => {
    if (isOpen) {
      setIframeLoading(true);
    }
  }, [isOpen, effectiveUrl, reloadKey]);

  if (!isOpen) return null;

  const fileName = `inspection-${shortCode || "Miqat"}.pdf`;

  const handleRefresh = () => {
    setIframeLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="mobile-dialog-panel relative flex flex-col w-full max-w-5xl h-[94dvh] sm:h-[90dvh] theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border theme-border">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 border-b theme-border theme-card-subtle">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span>محضر الفحص التشغيلي والفني للمركبة</span>
                  <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> معاينة موثقة (S3)
                  </span>
                </h3>
                <div className="flex items-center gap-3 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>
                    كود التقرير: <strong className="text-amber-600 dark:text-amber-400 font-mono font-bold">#INSP-{shortCode}</strong>
                  </span>
                  <span>•</span>
                  <span>الكابتن: <strong className="text-slate-700 dark:text-slate-200">{captainName}</strong></span>
                  {vehiclePlate && (
                    <>
                      <span>•</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                        {vehiclePlate}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {effectiveUrl && (
              <>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-2 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 rounded-xl border theme-card transition"
                  title="إعادة تحميل المعاينة"
                >
                  <RotateCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${iframeLoading ? "animate-spin" : ""}`} />
                </button>
                <a
                  href={directDownloadUrl || effectiveUrl}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl gold-gradient-btn transition shadow-sm"
                  title="تحميل ملف الفحص PDF مباشرة"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>تحميل PDF</span>
                </a>
                <a
                  href={effectiveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl border theme-card hover:border-amber-500 transition text-slate-700 dark:text-slate-300"
                  title="فتح في نافذة كاملة للطباعة والمشاركة"
                >
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                  <span className="hidden sm:inline">نافذة كاملة</span>
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="hidden sm:flex p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Frame */}
        <div className="relative min-h-0 flex-1 w-full p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-950 flex flex-col">
          {iframeLoading && effectiveUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs z-10 gap-3">
              <div className="w-9 h-9 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  جاري تجهيز وتحميل محضر الفحص التشغيلي...
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  #INSP-{shortCode}
                </p>
              </div>
            </div>
          )}

          {effectiveUrl ? (
            <iframe
              key={`${effectiveUrl}-${reloadKey}`}
              src={`${effectiveUrl}#toolbar=1&navpanes=0`}
              onLoad={() => setIframeLoading(false)}
              className="w-full h-full rounded-xl sm:rounded-2xl border theme-border bg-white"
              title="معاينة سجل الفحص التشغيلي"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
              <p className="font-bold text-sm">تعذر تحديد رابط ملف الفحص</p>
              <p className="text-xs text-slate-400 mt-1">يرجى التأكد من اعتماد الفحص وتوفر ملف PDF</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t theme-border theme-card-subtle flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            نموذج فحص رسمي مطابق لمعايير الهيئة العامة للنقل
          </span>
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
            شركة ميقات الخليج للنقل البري
          </span>
        </div>
      </div>
    </div>
  );
}
