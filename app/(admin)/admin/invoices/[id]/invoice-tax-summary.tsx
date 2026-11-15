"use client";
import { useUiText } from "@/lib/ui-text";

import Link from "next/link";
import { ArrowUpRight, FileMinus, FilePlus } from "lucide-react";
import { dateLabel, invoiceTitle, type InvoiceDetail } from "@/lib/invoices";
import { formatMoneyValue } from "@/app/_components/ui/Money";
import InvoiceQr from "./invoice-qr";

interface InvoiceTaxSummaryProps {
  invoice: InvoiceDetail;
}

export default function InvoiceTaxSummary({ invoice }: InvoiceTaxSummaryProps) {
  const ui = useUiText();
  const text = (ar: string, en: string) => (ui.language === "en" ? en : ar);

  const tax = invoice.snapshot.input.taxDocument;
  if (!tax) return null;

  const creditBalance = invoice.creditBalance;
  const adjustments = invoice.adjustments || [];

  return (
    <section className="theme-card space-y-4 rounded-2xl border theme-border p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="space-y-2.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-[var(--text-main)]">
              {ui(invoiceTitle(invoice.snapshot.input))}
            </h2>
            <span className="rounded-full border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)] px-2.5 py-0.5 text-xs font-bold text-[var(--accent-gold)]">
              {tax.profile === "STANDARD"
                ? text("فاتورة قياسية B2B", "Standard B2B")
                : text("مبسطة B2C", "Simplified B2C")}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-[var(--text-main)]">
            <p>
              <span className="text-[var(--text-muted)]">{ui("تاريخ التوريد:")}</span>{" "}
              <bdi className="font-mono font-semibold" dir="ltr">
                {tax.supplyDate}
              </bdi>
            </p>
            {tax.adjustmentEventDate && (
              <p>
                <span className="text-[var(--text-muted)]">
                  {text("تاريخ الواقعة المصححة:", "Adjustment event date:")}
                </span>{" "}
                <bdi className="font-mono font-semibold" dir="ltr">
                  {tax.adjustmentEventDate}
                </bdi>
              </p>
            )}
          </div>

          {(invoice.originalInvoice || invoice.snapshot.original) && (
            <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3 text-xs sm:text-sm space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--text-muted)]">{ui("الفاتورة الأصلية:")}</span>
                {invoice.originalInvoice ? (
                  <Link
                    href={`/admin/invoices/${encodeURIComponent(invoice.originalInvoice.id)}`}
                    className="inline-flex items-center gap-1 font-mono font-bold text-[var(--accent-gold)] hover:underline"
                    dir="ltr"
                  >
                    <span>{invoice.originalInvoice.invoiceNumber}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                ) : (
                  <bdi className="font-mono font-bold text-[var(--text-main)]" dir="ltr">
                    {invoice.snapshot.original?.number}
                  </bdi>
                )}
                {invoice.originalInvoice && (
                  <span className="text-xs text-[var(--text-muted)] font-mono" dir="ltr">
                    ({formatMoneyValue(invoice.originalInvoice.totalAmount)} SAR ·{" "}
                    {dateLabel(invoice.originalInvoice.invoiceDate, ui.language)})
                  </span>
                )}
              </div>
              {tax.adjustmentReason && (
                <p className="text-[var(--text-main)]">
                  <span className="text-[var(--text-muted)]">{ui("سبب الإشعار:")}</span>{" "}
                  {tax.adjustmentReason}
                </p>
              )}
            </div>
          )}

          {creditBalance && tax.kind === "INVOICE" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-3 py-2">
                <span className="text-xs text-emerald-800 dark:text-emerald-300 block font-bold">
                  {text("المتاح للإشعار الدائن", "Available to Credit")}
                </span>
                <strong className="font-mono text-sm font-semibold text-emerald-800 dark:text-emerald-300" dir="ltr">
                  {formatMoneyValue(creditBalance.availableGross)} {text("ر.س", "SAR")}
                </strong>
              </div>
              <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-3 py-2">
                <span className="text-xs text-[var(--text-muted)] block font-bold">
                  {text("إجمالي الإشعارات الدائنة", "Credited Total")}
                </span>
                <strong className="font-mono text-sm font-semibold text-rose-700 dark:text-rose-400" dir="ltr">
                  {formatMoneyValue(creditBalance.creditedGross)} {text("ر.س", "SAR")}
                </strong>
              </div>
              <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-3 py-2">
                <span className="text-xs text-[var(--text-muted)] block font-bold">
                  {text("إجمالي الإشعارات المدينة", "Debited Total")}
                </span>
                <strong className="font-mono text-sm font-semibold text-[var(--accent-gold)]" dir="ltr">
                  {formatMoneyValue(creditBalance.debitedGross)} {text("ر.س", "SAR")}
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <InvoiceQr invoiceId={invoice.id} isTax />
        </div>
      </div>

      {adjustments.length > 0 && (
        <div className="border-t theme-border pt-3.5 space-y-2">
          <h3 className="text-xs font-bold text-[var(--text-muted)]">
            {text(
              `الإشعارات المرتبطة بهذه الفاتورة (${adjustments.length})`,
              `Linked Adjustment Notes (${adjustments.length})`,
            )}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {adjustments.map((adj) => {
              const isCredit = adj.kind === "CREDIT";
              return (
                <Link
                  key={adj.id}
                  href={`/admin/invoices/${encodeURIComponent(adj.id)}`}
                  className="flex items-center justify-between gap-3 rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-3.5 py-2.5 hover:border-[var(--accent-gold)] transition"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      {isCredit ? (
                        <FileMinus className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 shrink-0" aria-hidden="true" />
                      ) : (
                        <FilePlus className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                      )}
                      <span className="font-mono text-xs font-bold text-[var(--accent-gold)]" dir="ltr">
                        {adj.invoiceNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          isCredit
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                            : "bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                        }`}
                      >
                        {isCredit ? text("دائن", "Credit") : text("مدين", "Debit")}
                      </span>
                    </div>
                    {adj.adjustmentReason && (
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {adj.adjustmentReason}
                      </p>
                    )}
                  </div>
                  <div className="text-end shrink-0">
                    <div
                      className={`font-mono text-xs font-bold ${
                        isCredit ? "text-rose-700 dark:text-rose-400" : "text-[var(--text-main)]"
                      }`}
                      dir="ltr"
                    >
                      {isCredit ? "-" : "+"}
                      {formatMoneyValue(adj.totalAmount)} {text("ر.س", "SAR")}
                    </div>
                    <div className="font-mono text-[11px] text-[var(--text-muted)]" dir="ltr">
                      {dateLabel(adj.invoiceDate, ui.language)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
