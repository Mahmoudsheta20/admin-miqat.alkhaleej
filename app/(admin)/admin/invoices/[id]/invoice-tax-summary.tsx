"use client";
import { useUiText } from "@/lib/ui-text";

import Link from "next/link";
import { invoiceTitle, type InvoiceDetail } from "@/lib/invoices";
import InvoiceQr from "./invoice-qr";
interface InvoiceTaxSummaryProps { invoice: InvoiceDetail }
export default function InvoiceTaxSummary({ invoice }: InvoiceTaxSummaryProps) {
  const ui = useUiText();

  const tax = invoice.snapshot.input.taxDocument;
  if (!tax) return null;
  return (
    <section className="theme-card flex flex-wrap items-center justify-between gap-5 rounded-2xl border theme-border p-5 sm:p-6">
      <div className="space-y-3">
        <h2 className="text-base font-bold">{ui(invoiceTitle(invoice.snapshot.input))}</h2>
        <p className="text-sm">
          {ui("تاريخ التوريد:")} <bdi className="font-mono" dir="ltr">{tax.supplyDate}</bdi>
        </p>
        {invoice.snapshot.original && (
          <p className="text-sm leading-relaxed">
            {ui("الفاتورة الأصلية:")} <bdi className="font-mono" dir="ltr">{invoice.snapshot.original.number}</bdi>
            <br />
            {ui("سبب الإشعار:")} {tax.adjustmentReason}
          </p>
        )}
        {tax.kind === "INVOICE" && (
          <div className="flex flex-wrap gap-3">
            <Link
              className="theme-card inline-flex min-h-11 sm:min-h-9 items-center rounded-lg border theme-border hover:border-amber-500 px-3 py-2 text-sm font-bold transition"
              href={`/admin/zatca/new?originalInvoiceId=${invoice.id}&kind=CREDIT`}
            >
              {ui("إشعار دائن")}</Link>
            <Link
              className="theme-card inline-flex min-h-11 sm:min-h-9 items-center rounded-lg border theme-border hover:border-amber-500 px-3 py-2 text-sm font-bold transition"
              href={`/admin/zatca/new?originalInvoiceId=${invoice.id}&kind=DEBIT`}
            >
              {ui("إشعار مدين")}</Link>
          </div>
        )}
      </div>
      <div>
        <InvoiceQr invoiceId={invoice.id} isTax />
      </div>
    </section>
  );
}
