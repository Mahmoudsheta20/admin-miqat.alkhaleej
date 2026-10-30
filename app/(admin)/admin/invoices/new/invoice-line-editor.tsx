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

const INPUT =
  "theme-input mt-1.5 h-11 w-full min-w-0 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30";

const COMPONENTS: Record<string, string> = {
  OWN_SUPPLY: "توريد المنشأة المباشر",
  SUPPLIER_CHARGE: "تكلفة مورد ضمن الخدمة",
  AGENCY_FEE: "رسوم خدمة وكالة",
  COMMISSION: "عمولة نقل",
};

const TAX_OPTIONS: { code: string; label: string; rate: string; hint: string }[] = [
  { code: "S", label: "خاضع لضريبة ١٥٪ (النسبة الأساسية)", rate: "15", hint: "تطبق على معظم رحلات وخدمات النقل المحلية" },
  { code: "Z", label: "خاضع لنسبة صفرية 0% (صادرات ونقل دولي)", rate: "0", hint: "النقل الدولي للركاب أو رحلات خارج حدود المملكة" },
  { code: "E", label: "معفى من الضريبة (Exempt)", rate: "0", hint: "خدمات معفاة بموجب المادة 29 من اللائحة" },
  { code: "O", label: "خارج نطاق الضريبة (Out of Scope)", rate: "0", hint: "مبالغ ورسوم محصلة باسم ولحساب الغير" },
];

export default function InvoiceLineEditor({
  value,
  isBooking = false,
  index,
  amount,
  canRemove,
  onChange,
  onRemove,
}: InvoiceLineEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const expanded = isExpanded || isBooking || !value.component || !value.code.trim();

  const [priceEntryMode, setPriceEntryMode] = useState<"EXCL" | "INCL">("EXCL");
  const [inclusiveInput, setInclusiveInput] = useState<string>("");

  const [discountMode, setDiscountMode] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [discountPercent, setDiscountPercent] = useState("0");

  function handlePriceChange(rawVal: string, mode: "EXCL" | "INCL") {
    if (mode === "EXCL") {
      updatePrice({ unitPrice: rawVal });
    } else {
      setInclusiveInput(rawVal);
      const num = Number(rawVal);
      if (Number.isFinite(num) && num > 0) {
        // Subtotal = ROUND(Total / 1.15, 2)
        const net = (Math.round((num / 1.15) * 100) / 100).toFixed(2);
        updatePrice({ unitPrice: net });
      } else {
        updatePrice({ unitPrice: rawVal });
      }
    }
  }

  function updatePrice(change: Partial<InvoiceLineInput>) {
    const next = { ...value, ...change };
    onChange({
      ...change,
      ...(discountMode === "PERCENT"
        ? { discount: percentageDiscount(next.quantity, next.unitPrice, discountPercent) || "0" }
        : {}),
    });
  }

  const hasExemption = Boolean(value.category && value.category !== "S");

  return (
    <fieldset className="rounded-2xl border theme-border bg-slate-50/50 p-4 sm:p-5 dark:bg-slate-900/30 space-y-4">
      <div className="flex items-center justify-between gap-3 border-b theme-border pb-3">
        <legend className="px-1 text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <span className="rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 font-mono text-[11px] font-bold">
            #{index + 1}
          </span>
          <span>{value.description || `الخدمة ${index + 1}`}</span>
        </legend>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`حذف الخدمة ${index + 1}`}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 cursor-pointer"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="flex items-start gap-3">
        <label className="min-w-0 flex-1 text-xs font-bold text-slate-700 dark:text-slate-200">
          وصف الخدمة *
          <input
            required
            maxLength={200}
            className={INPUT}
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="مثال: نقل معتمرين VIP من مطار جدة إلى فندق مكة"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Quantity */}
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
          {isBooking && (value.billingUnit || "TRIP") === "TRIP" ? "عدد المركبات" : "الكمية"} *
          <input
            required
            inputMode="decimal"
            pattern={
              isBooking && (value.billingUnit || "TRIP") === "TRIP"
                ? "[1-9][0-9]{0,2}"
                : "[0-9]{1,10}([.][0-9]{1,6})?"
            }
            className={`${INPUT} font-mono`}
            value={value.quantity}
            onChange={(e) => updatePrice({ quantity: e.target.value })}
          />
        </label>

        {/* Unit */}
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
          الوحدة
          <select
            className={INPUT}
            value={value.billingUnit || "TRIP"}
            onChange={(e) => onChange({ billingUnit: e.target.value as BillingUnit })}
          >
            {Object.entries(BILLING_UNIT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {/* Unit Price with Mode Toggle */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200">
            <span>السعر (ر.س) *</span>
            <div className="inline-flex rounded-lg border theme-border p-0.5 bg-slate-100 dark:bg-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => setPriceEntryMode("EXCL")}
                className={`px-1.5 py-0.5 rounded transition ${
                  priceEntryMode === "EXCL"
                    ? "bg-white dark:bg-slate-700 font-black text-amber-700 dark:text-amber-400 shadow-2xs"
                    : "text-slate-500"
                }`}
                title="إدخال السعر قبل احتساب الضريبة"
              >
                قبل الضريبة
              </button>
              <button
                type="button"
                onClick={() => {
                  setPriceEntryMode("INCL");
                  if (value.unitPrice) {
                    const gross = (Number(value.unitPrice) * 1.15).toFixed(2);
                    setInclusiveInput(gross);
                  }
                }}
                className={`px-1.5 py-0.5 rounded transition ${
                  priceEntryMode === "INCL"
                    ? "bg-white dark:bg-slate-700 font-black text-amber-700 dark:text-amber-400 shadow-2xs"
                    : "text-slate-500"
                }`}
                title="إدخال السعر النهائي شامل ضريبة 15%"
              >
                شامل 15%
              </button>
            </div>
          </div>

          {priceEntryMode === "EXCL" ? (
            <input
              required
              inputMode="decimal"
              pattern="\d{1,10}(\.\d{1,6})?"
              className={`${INPUT} font-mono`}
              placeholder="0.00"
              value={value.unitPrice}
              onChange={(e) => handlePriceChange(e.target.value, "EXCL")}
            />
          ) : (
            <div>
              <input
                required
                inputMode="decimal"
                pattern="\d{1,10}(\.\d{1,6})?"
                className={`${INPUT} font-mono`}
                placeholder="0.00"
                value={inclusiveInput}
                onChange={(e) => handlePriceChange(e.target.value, "INCL")}
              />
              <span className="block text-[10px] text-slate-400 mt-1 font-mono">
                صافي قبل الضريبة: {value.unitPrice || "0.00"} ر.س
              </span>
            </div>
          )}
        </div>

        {/* Tax Category */}
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
          المعاملة الضريبية *
          <select
            required
            className={INPUT}
            value={value.category}
            onChange={(e) => {
              const cat = e.target.value;
              onChange({
                category: cat,
                rate: cat === "S" ? "15" : "0",
                ...(cat === "S" ? { exemptionCode: undefined, exemptionReason: undefined } : {}),
              });
            }}
          >
            <option value="">اختر المعاملة الضريبية</option>
            {TAX_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Exemption Fields if Zero or Exempt */}
      {hasExemption && (
        <div className="grid gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3.5 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            رمز الإعفاء الضريبي الرسمي *
            <input
              required
              maxLength={100}
              className={INPUT}
              placeholder="مثال: VATEX-SA-32 أو VATEX-SA-35"
              value={value.exemptionCode || ""}
              onChange={(e) => onChange({ exemptionCode: e.target.value })}
            />
          </label>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            سبب الإعفاء أو النسبة الصفرية بالعربية *
            <input
              required
              maxLength={200}
              className={INPUT}
              placeholder="مثال: توريد خدمات نقل دولي خارج حدود المملكة"
              value={value.exemptionReason || ""}
              onChange={(e) => onChange({ exemptionReason: e.target.value })}
            />
          </label>
        </div>
      )}

      {/* Expand for Discount & Details */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 rounded-lg py-1.5 text-xs font-bold text-slate-500 hover:text-amber-700 dark:hover:text-amber-400 cursor-pointer"
        >
          <SlidersHorizontal className="size-3.5" />
          <span>تطبيق خصم أو تفاصيل توريد إضافية</span>
          <ChevronDown className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>

        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
          إجمالي هذا البند (شامل الضريبة):{" "}
          <b className="ms-1.5 font-mono text-sm text-slate-900 dark:text-white" dir="ltr">
            {amount || "—"}
          </b>
          <span className="ms-1 text-amber-600 dark:text-amber-400">ر.س</span>
        </p>
      </div>

      {expanded && (
        <div className="grid gap-3 border-t theme-border pt-4 sm:grid-cols-3">
          {/* Service Code */}
          <label className="text-xs font-bold text-slate-500">
            رمز الخدمة (الكود الداخلي)
            <input
              required
              maxLength={200}
              className={INPUT}
              value={value.code}
              onChange={(e) => onChange({ code: e.target.value })}
            />
          </label>

          {/* Discount */}
          <div>
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
              <span>الخصم</span>
              <select
                aria-label={`نوع الخصم للخدمة ${index + 1}`}
                className="theme-input rounded-md px-1.5 py-0.5 text-[11px]"
                value={discountMode}
                onChange={(e) => {
                  const mode = e.target.value as "AMOUNT" | "PERCENT";
                  setDiscountMode(mode);
                  if (mode === "PERCENT") {
                    onChange({
                      discount: percentageDiscount(value.quantity, value.unitPrice, discountPercent) || "0",
                    });
                  }
                }}
              >
                <option value="AMOUNT">مبلغ خصم (ر.س)</option>
                <option value="PERCENT">نسبة مئوية (%)</option>
              </select>
            </div>
            <input
              aria-label={`قيمة الخصم للخدمة ${index + 1}`}
              inputMode="decimal"
              pattern={
                discountMode === "PERCENT"
                  ? "(?:100(?:[.]0{1,2})?|0?[0-9]{1,2}(?:[.][0-9]{1,2})?)"
                  : "[0-9]{1,10}([.][0-9]{1,2})?"
              }
              className={`${INPUT} font-mono`}
              value={discountMode === "PERCENT" ? discountPercent : value.discount}
              onChange={(e) => {
                if (discountMode === "PERCENT") {
                  setDiscountPercent(e.target.value);
                  onChange({
                    discount: percentageDiscount(value.quantity, value.unitPrice, e.target.value) || "0",
                  });
                } else {
                  onChange({ discount: e.target.value });
                }
              }}
            />
          </div>

          {/* Component */}
          <label className="text-xs font-bold text-slate-500">
            طبيعة التوريد
            <select
              required
              className={INPUT}
              value={value.component}
              onChange={(e) => onChange({ component: e.target.value })}
            >
              <option value="">اختر طبيعة التوريد</option>
              {Object.entries(COMPONENTS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </fieldset>
  );
}
