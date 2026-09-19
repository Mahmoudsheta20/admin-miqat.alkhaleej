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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="relative flex flex-col w-full max-w-5xl h-[90vh] theme-card rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border theme-card-subtle">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                العقد الرسمي للنقل البري (3 صفحات معتمدة)
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3 h-3" /> مطابق للائحة هيئة النقل
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                رقم العقد: <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">{referenceNumber}</span> • ترخيص رقم: 35/00009318 • الرقم الموحد: 7054842252
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              download={`Miqat_Contract_${referenceNumber}.pdf`}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl gold-gradient-btn transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              تحميل PDF
            </a>
            <button
              onClick={() => window.open(pdfUrl, "_blank")}
              className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl border theme-card hover:border-amber-500 transition"
              title="فتح في نافذة جديدة للطباعة"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Frame */}
        <div className="flex-1 w-full p-2 bg-slate-100 dark:bg-slate-950">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full rounded-2xl border theme-border bg-white"
            title="العقد الرسمي"
          />
        </div>

        {/* Footer notes */}
        <div className="px-6 py-3 border-t theme-border theme-card-subtle flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>الصفحة 1: بنود النقل والمادتين 39 و 40 • الصفحة 2: كشف الركاب (13 مقعداً) • الصفحة 3: الفحص اليومي والختم</span>
          <span className="font-mono font-bold">شركة ميقات الخليج للنقل البري</span>
        </div>
      </div>
    </div>
  );
}
