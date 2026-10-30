"use client";
import Link from "next/link";
import { invoiceTitle, type InvoiceDetail } from "@/lib/invoices";
import InvoiceQr from "./invoice-qr";
interface InvoiceTaxSummaryProps { invoice: InvoiceDetail }
export default function InvoiceTaxSummary({ invoice }: InvoiceTaxSummaryProps) {
  const tax = invoice.snapshot.input.taxDocument;
  if (!tax) return null;
  return (
    <section className="theme-card flex flex-wrap items-center justify-between gap-5 rounded-2xl border theme-border p-5 sm:p-6">
      <div className="space-y-3">
        <h2 className="text-base font-bold">{invoiceTitle(invoice.snapshot.input)}</h2>
        <p className="text-sm">
          تاريخ التوريد: <bdi className="font-mono">{tax.supplyDate}</bdi>
        </p>
        {invoice.snapshot.original && (
          <p className="text-sm leading-relaxed">
            الفاتورة الأصلية: <bdi className="font-mono">{invoice.snapshot.original.number}</bdi>
            <br />
            سبب الإشعار: {tax.adjustmentReason}
          </p>
        )}
        {tax.kind === "INVOICE" && (
          <div className="flex flex-wrap gap-3">
            <Link
              className="theme-card rounded-lg border theme-border hover:border-amber-500 px-3 py-2 text-sm font-bold transition"
              href={`/admin/zatca/new?originalInvoiceId=${invoice.id}&kind=CREDIT`}
            >
              إشعار دائن
            </Link>
            <Link
              className="theme-card rounded-lg border theme-border hover:border-amber-500 px-3 py-2 text-sm font-bold transition"
              href={`/admin/zatca/new?originalInvoiceId=${invoice.id}&kind=DEBIT`}
            >
              إشعار مدين
            </Link>
          </div>
        )}
      </div>
      <div>
        <InvoiceQr invoiceId={invoice.id} isTax />
      </div>
    </section>
  );
}
