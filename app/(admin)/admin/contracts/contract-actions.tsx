"use client";

import Link from "next/link";
import {
  Edit2,
  Eye,
  FileText,
  ArrowLeftRight,
  ReceiptText,
  MessageSquare,
} from "lucide-react";
import { useUiText } from "@/lib/ui-text";
import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "@/app/_components/ui";

interface ContractActionsProps {
  contractId: string;
  onPreview: () => void;
  onReverse?: () => void;
  onWhatsApp?: () => void;
  isFullWidth?: boolean;
}

export default function ContractActions({
  contractId,
  onPreview,
  onReverse,
  onWhatsApp,
  isFullWidth = false,
}: ContractActionsProps) {
  const ui = useUiText();
  const detailHref = `/admin/contracts/${encodeURIComponent(contractId)}`;
  const editHref = `/admin/contracts/${encodeURIComponent(contractId)}/edit`;
  const invoiceHref = `/admin/invoices/new?contractId=${encodeURIComponent(contractId)}`;

  return (
    <div
      className={
        isFullWidth
          ? "flex w-full items-center gap-2"
          : "inline-flex items-center gap-1.5"
      }
    >
      <Link
        href={detailHref}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-surface)]/55 text-[var(--text-main)] text-xs font-semibold transition-colors ${
          isFullWidth ? "flex-1 min-h-11 px-3" : "h-9 px-2.5"
        }`}
        title={ui("التفاصيل")}
      >
        <Eye
          className="h-3.5 w-3.5 text-[var(--text-muted)]"
          aria-hidden="true"
        />
        <span>{ui("التفاصيل")}</span>
      </Link>

      <button
        type="button"
        onClick={onPreview}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg gold-gradient-btn text-xs font-semibold cursor-pointer ${
          isFullWidth ? "flex-1 min-h-11 px-3" : "h-9 px-2.5"
        }`}
        title={ui("معاينة العقد وتحميله وطباعته")}
      >
        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        <span>PDF</span>
      </button>

      <ActionMenu
        label={ui("المزيد من الإجراءات")}
        triggerClassName={isFullWidth ? "min-h-11 w-11 shrink-0" : "h-9 w-9"}
      >
        <ActionMenuItem
          href={editHref}
          icon={<Edit2 className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          {ui("تعديل")}
        </ActionMenuItem>

        <ActionMenuItem
          href={invoiceHref}
          icon={<ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />}
          tone="gold"
        >
          {ui("إنشاء فاتورة")}
        </ActionMenuItem>

        {(onReverse || onWhatsApp) && <ActionMenuSeparator />}

        {onReverse && (
          <ActionMenuItem
            onClick={onReverse}
            icon={<ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />}
            tone="blue"
          >
            {ui("رحلة عكسية")}
          </ActionMenuItem>
        )}

        {onWhatsApp && (
          <ActionMenuItem
            onClick={onWhatsApp}
            icon={<MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />}
            tone="emerald"
          >
            {ui("إرسال عبر واتساب")}
          </ActionMenuItem>
        )}
      </ActionMenu>
    </div>
  );
}
