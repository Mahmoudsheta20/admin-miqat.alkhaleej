"use client";
import { INVOICE_TYPE_LABELS, type InvoiceDocumentType } from "@/lib/invoices";
interface InvoiceTypeSelectorProps { value: InvoiceDocumentType; onChange: (value: InvoiceDocumentType) => void }
const DESCRIPTIONS = { BOOKING: "الشكل الحالي مع تفاصيل السائق والمركبة والمسافة.", PROFORMA: "ملخص الحجز والضيف وجدول النقل مع إجماليات واضحة." };
export default function InvoiceTypeSelector({ value, onChange }: InvoiceTypeSelectorProps) {
  return <fieldset className="theme-card rounded-2xl p-5 sm:p-6"><legend className="sr-only">نوع الفاتورة</legend><p className="mb-4 text-sm font-bold">نوع الفاتورة</p><div className="grid gap-3 sm:grid-cols-2">{(["BOOKING", "PROFORMA"] as const).map(type => <label key={type} className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-amber-500 ${value === type ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10" : "theme-border hover:border-amber-400"}`}><input type="radio" name="invoiceDocumentType" value={type} checked={value === type} onChange={() => onChange(type)} className="mt-1 size-4 shrink-0 accent-amber-600" /><span><span className="block text-sm font-bold">{INVOICE_TYPE_LABELS[type]}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{DESCRIPTIONS[type]}</span></span></label>)}</div></fieldset>;
}
