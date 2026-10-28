"use client";
import { useState } from "react";
import { ChevronDown, SlidersHorizontal, Trash2 } from "lucide-react";
import { percentageDiscount } from "@/lib/invoice-booking";
import type { InvoiceLineInput } from "@/lib/invoices";
import { BILLING_UNIT_LABELS, type BillingUnit } from "@/lib/invoice-transport";
interface InvoiceLineEditorProps {
  value: InvoiceLineInput;
  isBooking?: boolean;
  index: number;
  amount?: string;
  canRemove: boolean;
  onChange: (change: Partial<InvoiceLineInput>) => void;
  onRemove: () => void;
}
const INPUT = "theme-input mt-1.5 h-11 w-full min-w-0 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30";
const COMPONENTS: Record<string, string> = { OWN_SUPPLY: "توريد المنشأة", SUPPLIER_CHARGE: "تكلفة مورد ضمن التوريد", AGENCY_FEE: "رسوم خدمة وكالة", COMMISSION: "عمولة" };
export default function InvoiceLineEditor({ value, isBooking = false, index, amount, canRemove, onChange, onRemove }: InvoiceLineEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const expanded = isExpanded || isBooking || !value.component || !value.code.trim();
  const [discountMode, setDiscountMode] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [discountPercent, setDiscountPercent] = useState("0");
  function updatePrice(change: Partial<InvoiceLineInput>) {
    const next = { ...value, ...change };
    onChange({ ...change, ...(discountMode === "PERCENT" ? { discount: percentageDiscount(next.quantity, next.unitPrice, discountPercent) || "0" } : {}) });
  }
  const hasExemption = Boolean(value.category && value.category !== "S");
  return <fieldset className="rounded-2xl border theme-border bg-slate-50/40 p-4 dark:bg-slate-900/20">
    <legend className="px-2 text-xs font-bold text-slate-500">الخدمة {index + 1}</legend>
    <div className="flex items-start gap-3">
      <label className="min-w-0 flex-1 text-sm font-bold">وصف الخدمة<input required maxLength={200} className={INPUT} value={value.description} onChange={event => onChange({ description: event.target.value })} placeholder="مثال: نقل مجموعة من مكة إلى مطار جدة" /></label>
      {canRemove && <button type="button" onClick={onRemove} aria-label={`حذف الخدمة ${index + 1}`} className="mt-7 rounded-xl p-3 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="size-4" /></button>}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <label className="text-xs font-bold text-slate-500">{isBooking && (value.billingUnit || "TRIP") === "TRIP" ? "عدد المركبات" : "الكمية"}<input required inputMode="decimal" pattern={isBooking && (value.billingUnit || "TRIP") === "TRIP" ? "[1-9][0-9]{0,2}" : "[0-9]{1,10}([.][0-9]{1,6})?"} className={`${INPUT} font-mono`} value={value.quantity} onChange={event => updatePrice({ quantity: event.target.value })} /></label>
      <label className="text-xs font-bold text-slate-500">الوحدة<select className={INPUT} value={value.billingUnit || "TRIP"} onChange={event => onChange({ billingUnit: event.target.value as BillingUnit })}>{Object.entries(BILLING_UNIT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-500">سعر الوحدة (ر.س)<input required inputMode="decimal" pattern="\d{1,10}(\.\d{1,6})?" className={`${INPUT} font-mono`} placeholder="0.00" value={value.unitPrice} onChange={event => updatePrice({ unitPrice: event.target.value })} /></label>
      <label className="text-xs font-bold text-slate-500">الضريبة<select required className={INPUT} value={value.category} onChange={event => onChange({ category: event.target.value, rate: event.target.value ? event.target.value === "S" ? "15" : "0" : "", ...(event.target.value === "S" ? { exemptionCode: undefined, exemptionReason: undefined } : {}) })}><option value="">اختر الضريبة</option><option value="S">15% - خاضع</option><option value="Z">0% - نسبة صفرية</option><option value="E">معفى</option><option value="O">خارج النطاق</option></select></label>
    </div>
    {hasExemption && <div className="mt-4 grid gap-3 rounded-xl bg-amber-50/60 p-3 dark:bg-amber-500/5 sm:grid-cols-2"><label className="text-xs font-bold">رمز الإعفاء<input required maxLength={100} className={INPUT} placeholder="VATEX-SA-…" value={value.exemptionCode || ""} onChange={event => onChange({ exemptionCode: event.target.value })} /></label><label className="text-xs font-bold">سبب الإعفاء<input required maxLength={200} className={INPUT} value={value.exemptionReason || ""} onChange={event => onChange({ exemptionReason: event.target.value })} /></label></div>}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      {!isBooking && <button type="button" aria-expanded={expanded} onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-1.5 rounded-lg py-1.5 text-xs font-bold text-slate-500 hover:text-amber-700 dark:hover:text-amber-400"><SlidersHorizontal className="size-3.5" />خصم وتفاصيل إضافية<ChevronDown className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} /></button>}
      <p className="text-xs text-slate-500">الإجمالي شامل الضريبة <b className="ms-2 font-mono text-sm text-slate-900 dark:text-slate-100" dir="ltr">{amount || "—"}</b><span className="ms-1">ر.س</span></p>
    </div>
    {expanded && <div className="mt-3 grid gap-3 border-t theme-border pt-4 sm:grid-cols-3"><label className="text-xs font-bold text-slate-500">رمز الخدمة<input required maxLength={200} className={INPUT} value={value.code} onChange={event => onChange({ code: event.target.value })} /></label><div><div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500"><span>الخصم</span><select aria-label={`نوع الخصم للخدمة ${index + 1}`} className="theme-input rounded-md px-1 py-0.5 text-[11px]" value={discountMode} onChange={event => {
      const mode = event.target.value as "AMOUNT" | "PERCENT"; setDiscountMode(mode);
      if (mode === "PERCENT") onChange({ discount: percentageDiscount(value.quantity, value.unitPrice, discountPercent) || "0" });
    }}><option value="AMOUNT">مبلغ (ر.س)</option><option value="PERCENT">نسبة %</option></select></div><input aria-label={`قيمة الخصم للخدمة ${index + 1}`} inputMode="decimal" pattern={discountMode === "PERCENT" ? "(?:100(?:[.]0{1,2})?|0?[0-9]{1,2}(?:[.][0-9]{1,2})?)" : "[0-9]{1,10}([.][0-9]{1,2})?"} className={`${INPUT} font-mono`} value={discountMode === "PERCENT" ? discountPercent : value.discount} onChange={event => {
      if (discountMode === "PERCENT") { setDiscountPercent(event.target.value); onChange({ discount: percentageDiscount(value.quantity, value.unitPrice, event.target.value) || "0" }); }
      else onChange({ discount: event.target.value });
    }} /></div><label className="text-xs font-bold text-slate-500">طبيعة التوريد<select required className={INPUT} value={value.component} onChange={event => onChange({ component: event.target.value })}><option value="">اختر طبيعة التوريد</option>{Object.entries(COMPONENTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>}
  </fieldset>;
}
