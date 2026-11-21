"use client";

import { CheckCircle2 } from "lucide-react";
import { useUiText } from "@/lib/ui-text";
import {
  INVOICE_TYPE_LABELS,
  type InvoiceDocumentType,
  type InvoiceSettings,
} from "@/lib/invoices";
import { amount, type BuyerForm, type FormLine } from "./invoice-form-types";

interface InvoiceSummarySidebarProps {
  documentType: InvoiceDocumentType;
  buyer: BuyerForm;
  rows: FormLine[];
  beforeDiscountNet: string;
  discountTotal: string;
  estimateNet: string;
  estimateVat: string;
  estimateGross: string;
  estimateIsValid: boolean;
  estimateError?: string;
  paymentStatusChoice: "NOT_PAID" | "FULLY_PAID" | "PARTIALLY_PAID";
  remainingBalance: string;
  company: InvoiceSettings["company"] | null | undefined;
  isSaving: boolean;
}

export default function InvoiceSummarySidebar({
  documentType,
  buyer,
  rows,
  beforeDiscountNet,
  discountTotal,
  estimateNet,
  estimateVat,
  estimateGross,
  estimateIsValid,
  estimateError,
  paymentStatusChoice,
  remainingBalance,
  company,
  isSaving,
}: InvoiceSummarySidebarProps) {
  const ui = useUiText();

  return (
    <aside className="min-w-0 lg:sticky lg:top-5 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
      <fieldset disabled={isSaving} className="min-w-0 space-y-4">
        <section className="overflow-hidden rounded-2xl border theme-border bg-[var(--bg-card)]">
          <div className="border-b theme-border px-4 py-3.5 bg-[var(--bg-card-subtle)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--accent-gold)]">
                {ui("ملخص المستند")}
              </span>
              <span className="text-xs font-bold text-[var(--text-muted)] font-mono">
                {rows.length} {ui(rows.length === 1 ? "خدمة" : "خدمات")}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)] mt-1">
              {ui(
                documentType === "PROFORMA"
                  ? "فاتورة مبدئية"
                  : INVOICE_TYPE_LABELS[documentType],
              )}
            </h2>
            {buyer.name && (
              <p className="text-xs sm:text-sm text-[var(--text-muted)] truncate mt-0.5">
                {ui("العميل:")} {buyer.name}
              </p>
            )}
          </div>

          <dl aria-live="polite" className="space-y-2.5 px-4 py-3.5 text-xs sm:text-sm">
            {[
              ["الإجمالي قبل الخصم", beforeDiscountNet],
              ["قيمة الخصم", discountTotal],
              ["المبلغ قبل الضريبة", estimateNet],
              [
                rows.every((r) => r.input.rate === "0")
                  ? "ضريبة القيمة المضافة (0%)"
                  : rows.every((r) => r.input.rate === "15")
                    ? "ضريبة القيمة المضافة (15%)"
                    : "ضريبة القيمة المضافة",
                estimateVat,
              ],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-[var(--text-muted)]">{ui(label)}</dt>
                <dd className="font-mono font-bold text-[var(--text-main)]" dir="ltr">
                  {amount(val)}
                </dd>
              </div>
            ))}
          </dl>

          {/* Dark Slate Signature Total Box */}
          <div className="mx-3.5 mb-3.5 rounded-xl bg-slate-900 dark:bg-slate-800/95 p-3.5 text-white border border-slate-700">
            <p className="text-xs text-slate-200 font-bold">
              {ui("الإجمالي المطلوب شامل الضريبة")}
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <strong
                className="font-mono text-2xl font-semibold tracking-tight text-white"
                dir="ltr"
                data-testid="invoice-total"
              >
                {amount(estimateGross)}
              </strong>
              <span className="text-xs sm:text-sm font-bold text-amber-300">
                {ui("ر.س")}
              </span>
            </div>
          </div>

          {/* Remaining Amount Box if Partial or Not Paid */}
          {documentType !== "PROFORMA" && paymentStatusChoice !== "FULLY_PAID" && (
            <div className="mx-3.5 mb-3.5 rounded-xl bg-[var(--accent-surface)] p-3 text-sm border border-[var(--accent-gold)]/35">
              <div className="flex items-center justify-between text-[var(--accent-gold)] font-bold">
                <span>{ui("المبلغ المتبقي:")}</span>
                <span className="font-mono font-semibold" dir="ltr">
                  {amount(remainingBalance)} {ui("ر.س")}
                </span>
              </div>
            </div>
          )}

          {!estimateIsValid && estimateError && (
            <p className="px-4 pb-4 text-sm leading-relaxed text-rose-700 dark:text-rose-400 font-bold">
              {ui(estimateError)}
            </p>
          )}
        </section>

        {company && (
          <div className="rounded-xl border theme-border p-3.5 text-center text-sm text-[var(--text-muted)]">
            <p className="font-bold text-[var(--text-main)] flex items-center justify-center gap-1.5">
              <CheckCircle2
                className="size-4 text-[var(--accent-gold)]"
                aria-hidden="true"
              />
              <span>{company.legalName}</span>
            </p>
            {company.vatNumber && (
              <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                {ui("الرقم الضريبي:")} {company.vatNumber}
              </p>
            )}
          </div>
        )}
      </fieldset>
    </aside>
  );
}
