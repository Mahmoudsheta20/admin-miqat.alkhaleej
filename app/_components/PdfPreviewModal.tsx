"use client";

import React from "react";
import { X, Download, Printer, FileText, CheckCircle2 } from "lucide-react";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId?: string;
  referenceNumber?: string;
}

export default function PdfPreviewModal({
  isOpen,
  onClose,
  contractId,
  referenceNumber = "MQ-2026-00841",
}: PdfPreviewModalProps) {
  if (!isOpen) return null;

  const pdfUrl = contractId
    ? `/api/contracts/pdf?contractId=${contractId}`
    : `/api/contracts/pdf`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4">
      <div className="relative flex flex-col w-full max-w-5xl h-[95vh] sm:h-[90vh] theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
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
                    <CheckCircle2 className="w-3 h-3" /> معتمد رسمياً
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  رقم العقد: <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">{referenceNumber}</span>
                </p>
              </div>
            </div>

            {/* Mobile close button on top right */}
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <a
              href={pdfUrl}
              download={`Miqat_Contract_${referenceNumber}.pdf`}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl gold-gradient-btn transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>تحميل PDF</span>
            </a>
            <button
              onClick={() => window.open(pdfUrl, "_blank")}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl border theme-card hover:border-amber-500 transition text-slate-700 dark:text-slate-300"
              title="فتح في نافذة جديدة للطباعة"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </button>
            <button
              onClick={onClose}
              className="hidden sm:flex p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile notice banner for direct PDF opening */}
        <div className="sm:hidden bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 text-center text-[11px] font-bold text-amber-800 dark:text-amber-300">
          على الجوال، يمكنك النقر على &quot;تحميل PDF&quot; لفتحه أو حفظه مباشرة.
        </div>

        {/* PDF Frame */}
        <div className="flex-1 w-full p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-950">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full rounded-xl sm:rounded-2xl border theme-border bg-white"
            title="العقد الرسمي"
          />
        </div>

        {/* Footer notes */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t theme-border theme-card-subtle flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate">الصفحة 1: بنود النقل • الصفحة 2: كشف الركاب • الصفحة 3: الفحص والختم</span>
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">شركة ميقات الخليج للنقل البري</span>
        </div>
      </div>
    </div>
  );
}
