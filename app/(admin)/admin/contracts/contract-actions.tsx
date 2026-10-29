"use client";

import Link from "next/link";
import { Edit2, Eye, FileText, ArrowLeftRight, ReceiptText } from "lucide-react";

interface ContractActionsProps {
  contractId: string;
  onView: () => void;
  onPreview: () => void;
  onReverse?: () => void;
  isFullWidth?: boolean;
}

const ACTION_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 motion-reduce:transition-none";
const SECONDARY_CLASS = `${ACTION_CLASS} border theme-card text-slate-700 dark:text-slate-200 hover:border-amber-500 hover:shadow-md`;

export default function ContractActions({
  contractId,
  onView,
  onPreview,
  onReverse,
  isFullWidth = false,
}: ContractActionsProps) {
  return (
    <div
      className={
        isFullWidth
          ? "grid w-full grid-cols-2 sm:grid-cols-5 gap-2"
          : "inline-flex items-center gap-1.5"
      }
    >
      <button type="button" onClick={onView} className={SECONDARY_CLASS}>
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        <span>التفاصيل</span>
      </button>
      <Link
        href={`/admin/contracts/${encodeURIComponent(contractId)}/edit`}
        className={SECONDARY_CLASS}
      >
        <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>تعديل</span>
      </Link>
      <Link
        href={`/admin/invoices/new?contractId=${encodeURIComponent(contractId)}`}
        className={`${ACTION_CLASS} border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:border-amber-500 hover:bg-amber-500/20 hover:shadow-md`}
        title="إنشاء فاتورة مرتبطة بهذا العقد"
      >
        <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
        <span>فاتورة</span>
      </Link>
      {onReverse && (
        <button
          type="button"
          onClick={onReverse}
          className={`${ACTION_CLASS} border border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300 hover:border-blue-500 hover:bg-blue-500/10 hover:shadow-md`}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span>عكسية</span>
        </button>
      )}
      <button
        type="button"
        onClick={onPreview}
        className={`${ACTION_CLASS} gold-gradient-btn hover:shadow-md`}
        title="معاينة العقد وتحميله وطباعته"
      >
        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        <span>PDF</span>
      </button>
    </div>
  );
}
