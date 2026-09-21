"use client";

import React, { useState } from "react";
import { X, Download, Printer, FileText, CheckCircle2, ShieldCheck, Car } from "lucide-react";

interface InspectionPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionId?: string | null;
  captainName?: string;
  vehiclePlate?: string;
}

export default function InspectionPdfPreviewModal({
  isOpen,
  onClose,
  inspectionId,
  captainName = "الكابتن",
  vehiclePlate = "",
}: InspectionPdfPreviewModalProps) {
  const [viewMode, setViewMode] = useState<"document" | "pdf">("document");

  if (!isOpen || !inspectionId) return null;

  const pdfUrl = `/api/inspections/pdf?inspectionId=${encodeURIComponent(inspectionId)}`;
  const downloadUrl = `/api/inspections/pdf?inspectionId=${encodeURIComponent(inspectionId)}&download=1`;
  const htmlUrl = `/api/inspections/html?inspectionId=${encodeURIComponent(inspectionId)}`;
  const shortCode = inspectionId.slice(0, 8).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-5xl h-[95vh] sm:h-[90vh] theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
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
                    <CheckCircle2 className="w-3 h-3" /> معتمد رسمياً (16/16)
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

          {/* Actions & View Controls */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl border theme-border bg-slate-100 dark:bg-slate-800/80 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("document")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  viewMode === "document"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="عرض المستند عالي الدقة (HTML)"
              >
                معاينة الوثيقة
              </button>
              <button
                type="button"
                onClick={() => setViewMode("pdf")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  viewMode === "pdf"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="عرض في قارئ PDF"
              >
                قارئ PDF
              </button>
            </div>

            {/* Download Button */}
            <a
              href={downloadUrl}
              download={`Miqat_Inspection_${shortCode}.pdf`}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl gold-gradient-btn transition shadow-sm"
              title="توليد وتنزيل ملف PDF عالي الجودة"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>تحميل PDF</span>
            </a>

            {/* Print Button */}
            <a
              href={htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl border theme-card hover:border-amber-500 transition text-slate-700 dark:text-slate-300"
              title="طباعة الوثيقة في نافذة جديدة"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
              <span>طباعة</span>
            </a>

            {/* Desktop close button */}
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
        <div className="flex-1 w-full p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-950">
          <iframe
            src={viewMode === "document" ? htmlUrl : `${pdfUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full rounded-xl sm:rounded-2xl border theme-border bg-white"
            title="معاينة سجل الفحص التشغيلي"
          />
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
