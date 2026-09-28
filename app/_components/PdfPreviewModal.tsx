"use client";
import Modal from "./Modal";

import React, { useState, useCallback } from "react";
import { X, Download, ExternalLink, FileText, CheckCircle2, AlertCircle, RotateCw } from "lucide-react";
import { backendUrl, getAuthToken } from "@/lib/backend";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId?: string;
  referenceNumber?: string;
  pdfUrl?: string | null;
}

export default function PdfPreviewModal(props: PdfPreviewModalProps) {
  return props.isOpen ? <PdfPreviewContent {...props} /> : null;
}

function PdfPreviewContent({
  onClose,
  contractId,
  referenceNumber = "",
  pdfUrl,
}: PdfPreviewModalProps) {
  const id = contractId || referenceNumber;
  const token = getAuthToken();

  // Prefer backend server PDF endpoint for instant delivery without S3 latency
  const serverEndpoint = id
    ? backendUrl(`/contracts/${encodeURIComponent(id)}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`)
    : null;

  const url = serverEndpoint || pdfUrl?.trim() || null;

  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const iframeSrc = url
    ? `${url}${url.includes("?") ? "&" : "?"}v=${refreshKey}#toolbar=1&navpanes=0`
    : null;

  const downloadUrl = id
    ? backendUrl(`/contracts/${encodeURIComponent(id)}/pdf?download=1${token ? `&token=${encodeURIComponent(token)}` : ""}`)
    : url;

  const fileName = `Contract_${referenceNumber || id || "Miqat"}.pdf`;

  return (
    <Modal label="معاينة العقد" onClose={onClose}>
      <div className="mobile-dialog-panel relative flex flex-col w-full max-w-5xl h-[94dvh] sm:h-[90dvh] theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border theme-border">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 border-b theme-border theme-card-subtle">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span>العقد الرسمي للنقل البري</span>
                  <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> معاينة الوثيقة المحفوظة
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  رقم العقد: <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">{referenceNumber || id}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {url && (
              <>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-2 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 rounded-xl border theme-card transition"
                  title="إعادة تحميل المعاينة"
                >
                  <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <a
                  href={downloadUrl || url}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl gold-gradient-btn transition shadow-sm"
                  title="تحميل ملف العقد مباشرة"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>تحميل PDF</span>
                </a>
                <a
                  href={url}
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
          {iframeSrc ? (
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              className="w-full h-full rounded-xl sm:rounded-2xl border theme-border bg-white"
              title="معاينة العقد الرسمي"
            />
          ) : (
            <div role="alert" className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
              <p className="font-bold text-sm">تعذر تحديد رابط ملف العقد</p>
              <p className="text-xs text-slate-400 mt-1">يرجى التأكد من إنشاء العقد ووجود رقم مرجعي صالح</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t theme-border theme-card-subtle flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>الصفحة 1: بنود النقل • الصفحة 2: كشف الركاب • الصفحة 3: الفحص والختم</span>
          </div>
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">شركة ميقات الخليج للنقل البري</span>
        </div>
      </div>
    </Modal>
  );
}
