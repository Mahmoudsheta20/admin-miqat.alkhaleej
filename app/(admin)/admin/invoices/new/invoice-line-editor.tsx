"use client";
import { useUiText } from "@/lib/ui-text";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal, Trash2 } from "lucide-react";
import { percentageDiscount } from "@/lib/invoice-booking";
import { moneyDecimal, moneyMinor } from "@/lib/money";
import type { InvoiceLineInput } from "@/lib/invoices";
import { BILLING_UNIT_LABELS, type BillingUnit } from "@/lib/invoice-transport";
import { useIsMobileViewport } from "@/lib/use-mobile-viewport";
import {
  ExpandableField,
  FullscreenFieldModal,
} from "@/app/_components/form/FullscreenFieldModal";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";

interface InvoiceLineEditorProps {
  value: InvoiceLineInput;
  isBooking?: boolean;
  index: number;
  amount?: string;
  canRemove: boolean;
  onChange: (change: Partial<InvoiceLineInput>) => void;
  onRemove: () => void;
}

const INLINE_INPUT =
  "theme-input min-h-11 sm:min-h-9 w-full min-w-0 rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem]";

const COMPONENTS: Record<string, string> = {
  OWN_SUPPLY: "توريد المنشأة المباشر",
  SUPPLIER_CHARGE: "تكلفة مورد ضمن الخدمة",
  AGENCY_FEE: "رسوم خدمة وكالة",
  COMMISSION: "عمولة نقل",
};

const TAX_OPTIONS: {
  code: string;
  label: string;
  rate: string;
  hint: string;
}[] = [
  {
    code: "S",
    label: "خاضع لضريبة ١٥٪ (النسبة الأساسية)",
    rate: "15",
    hint: "تطبق على معظم رحلات وخدمات النقل المحلية",
  },
  {
    code: "Z",
    label: "خاضع لنسبة صفرية 0% (صادرات ونقل دولي)",
    rate: "0",
    hint: "النقل الدولي للركاب أو رحلات خارج حدود المملكة",
  },
  {
    code: "E",
    label: "معفى من الضريبة (Exempt)",
    rate: "0",
    hint: "خدمات معفاة بموجب المادة 29 من اللائحة",
  },
  {
    code: "O",
    label: "خارج نطاق الضريبة (Out of Scope)",
    rate: "0",
    hint: "مبالغ ورسوم محصلة باسم ولحساب الغير",
  },
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
  const ui = useUiText();
  const isMobile = useIsMobileViewport();

  const [isExpanded, setIsExpanded] = useState(false);
  const expanded =
    isExpanded || isBooking || !value.component || !value.code.trim();

  const [priceEntryMode, setPriceEntryMode] = useState<"EXCL" | "INCL">("EXCL");
  const [inclusiveInput, setInclusiveInput] = useState<string>("");

  const [discountMode, setDiscountMode] = useState<"AMOUNT" | "PERCENT">(
    "AMOUNT",
  );
  const [discountPercent, setDiscountPercent] = useState("0");
  const [priceExpandOpen, setPriceExpandOpen] = useState(false);
  const [priceExpandSession, setPriceExpandSession] = useState(0);
  const [discountExpandOpen, setDiscountExpandOpen] = useState(false);
  const [discountExpandSession, setDiscountExpandSession] = useState(0);

  const openPriceExpand = () => {
    if (!isMobile) return;
    setPriceExpandSession((prev) => prev + 1);
    setPriceExpandOpen(true);
  };

  const openDiscountExpand = () => {
    if (!isMobile) return;
    setDiscountExpandSession((prev) => prev + 1);
    setDiscountExpandOpen(true);
  };

  function handlePriceChange(rawVal: string, mode: "EXCL" | "INCL") {
    if (mode === "EXCL") {
      updatePrice({ unitPrice: rawVal });
    } else {
      setInclusiveInput(rawVal);
      const grossMinor = moneyMinor(rawVal);
      if (grossMinor !== null && grossMinor > BigInt(0)) {
        // Exact minor-unit net extraction: ROUND(grossMinor * 100 / 115)
        const netMinor = (grossMinor * BigInt(100) + BigInt(57)) / BigInt(115);
        updatePrice({ unitPrice: moneyDecimal(netMinor) });
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
        ? {
            discount:
              percentageDiscount(
                next.quantity,
                next.unitPrice,
                discountPercent,
              ) || "0",
          }
        : {}),
    });
  }

  const hasExemption = Boolean(value.category && value.category !== "S");

  return (
    <fieldset className="rounded-2xl border theme-border bg-[var(--bg-card-subtle)] p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 border-b theme-border pb-3">
        <legend className="px-1 text-sm sm:text-base font-semibold text-[var(--text-main)] flex items-center gap-2">
          <span className="rounded-md bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] px-2 py-0.5 font-mono text-xs sm:text-sm font-bold">
            #{index + 1}
          </span>
          <span>
            {value.description ||
              (ui.language === "en"
                ? `Service ${index + 1}`
                : `الخدمة ${index + 1}`)}
          </span>
        </legend>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={ui(`حذف الخدمة ${index + 1}`)}
            className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 cursor-pointer"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div>
        <ExpandableField
          label={ui("وصف الخدمة")}
          required
          maxLength={200}
          placeholder={ui("مثال: نقل معتمرين VIP من مطار جدة إلى فندق مكة")}
          value={value.description}
          onApply={(description) => onChange({ description })}
        >
          <input
            required
            maxLength={200}
            className={INLINE_INPUT}
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder={ui("مثال: نقل معتمرين VIP من مطار جدة إلى فندق مكة")}
          />
        </ExpandableField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 xl:grid-cols-4">
        {/* Quantity */}
        <ExpandableField
          label={ui(
            isBooking && (value.billingUnit || "TRIP") === "TRIP"
              ? "عدد المركبات"
              : "الكمية",
          )}
          required
          dir="ltr"
          inputMode="decimal"
          pattern={
            isBooking && (value.billingUnit || "TRIP") === "TRIP"
              ? "[1-9][0-9]{0,2}"
              : "[0-9]{1,10}([.][0-9]{1,6})?"
          }
          value={value.quantity}
          onApply={(quantity) => updatePrice({ quantity })}
        >
          <input
            required
            dir="ltr"
            inputMode="decimal"
            pattern={
              isBooking && (value.billingUnit || "TRIP") === "TRIP"
                ? "[1-9][0-9]{0,2}"
                : "[0-9]{1,10}([.][0-9]{1,6})?"
            }
            className={`${INLINE_INPUT} font-mono`}
            value={value.quantity}
            onChange={(e) => updatePrice({ quantity: e.target.value })}
          />
        </ExpandableField>

        {/* Unit */}
        <FullscreenSelect
          label={ui("الوحدة")}
          searchable={false}
          value={value.billingUnit || "TRIP"}
          onChange={(nextUnit) =>
            onChange({ billingUnit: nextUnit as BillingUnit })
          }
          options={Object.entries(BILLING_UNIT_LABELS).map(([k, label]) => ({
            value: k,
            label: ui(label),
          }))}
        />

        {/* Unit Price with Mode Toggle */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)]">
            <span>{ui("السعر (ر.س) *")}</span>
            <div className="inline-flex rounded-lg border border-[var(--control-border)] p-0.5 bg-[var(--bg-card)] text-xs shrink-0">
              <button
                type="button"
                aria-pressed={priceEntryMode === "EXCL"}
                onClick={() => setPriceEntryMode("EXCL")}
                className={`min-h-10 sm:min-h-7 px-2 py-0.5 rounded transition cursor-pointer ${
                  priceEntryMode === "EXCL"
                    ? "bg-[var(--accent-btn-bg)] font-semibold text-[var(--accent-btn-fg)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
                title={ui("إدخال السعر قبل احتساب الضريبة")}
              >
                {ui("قبل الضريبة")}
              </button>
              <button
                type="button"
                aria-pressed={priceEntryMode === "INCL"}
                onClick={() => {
                  setPriceEntryMode("INCL");
                  const netMinor = value.unitPrice
                    ? moneyMinor(value.unitPrice)
                    : null;
                  if (netMinor !== null && netMinor >= BigInt(0)) {
                    const grossMinor =
                      (netMinor * BigInt(115) + BigInt(50)) / BigInt(100);
                    setInclusiveInput(moneyDecimal(grossMinor));
                  }
                }}
                className={`min-h-10 sm:min-h-7 px-2 py-0.5 rounded transition cursor-pointer ${
                  priceEntryMode === "INCL"
                    ? "bg-[var(--accent-btn-bg)] font-semibold text-[var(--accent-btn-fg)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
                title={ui("إدخال السعر النهائي شامل ضريبة 15%")}
              >
                {ui("شامل 15%")}
              </button>
            </div>
          </div>

          {priceEntryMode === "EXCL" ? (
            <input
              required
              aria-label={ui("السعر (ر.س) *")}
              inputMode="decimal"
              dir="ltr"
              pattern="\d{1,10}(\.\d{1,6})?"
              className={`${INLINE_INPUT} font-mono text-start ${isMobile ? "cursor-pointer" : ""}`}
              placeholder="0.00"
              value={value.unitPrice}
              onClick={openPriceExpand}
              onKeyDown={(e) => {
                if (isMobile && e.key === "F2") {
                  e.preventDefault();
                  openPriceExpand();
                }
              }}
              onChange={(e) => handlePriceChange(e.target.value, "EXCL")}
            />
          ) : (
            <div>
              <input
                required
                aria-label={ui("السعر (ر.س) *")}
                inputMode="decimal"
                dir="ltr"
                pattern="\d{1,10}(\.\d{1,6})?"
                className={`${INLINE_INPUT} font-mono text-start ${isMobile ? "cursor-pointer" : ""}`}
                placeholder="0.00"
                value={inclusiveInput}
                onClick={openPriceExpand}
                onKeyDown={(e) => {
                  if (isMobile && e.key === "F2") {
                    e.preventDefault();
                    openPriceExpand();
                  }
                }}
                onChange={(e) => handlePriceChange(e.target.value, "INCL")}
              />
              <span className="block text-xs text-[var(--text-muted)] mt-1.5 font-mono">
                {ui("صافي قبل الضريبة:")}{" "}
                <bdi dir="ltr">{value.unitPrice || "0.00"}</bdi> {ui("ر.س")}
              </span>
            </div>
          )}

          {isMobile && (
            <FullscreenFieldModal
              open={priceExpandOpen}
              onClose={() => setPriceExpandOpen(false)}
              sessionKey={priceExpandSession}
              title={ui("السعر (ر.س)")}
              value={priceEntryMode === "EXCL" ? value.unitPrice : inclusiveInput}
              inputMode="decimal"
              dir="ltr"
              pattern="\d{1,10}(\.\d{1,6})?"
              placeholder="0.00"
              onApply={(next) => handlePriceChange(next, priceEntryMode)}
            />
          )}
        </div>

        {/* Tax Category */}
        <FullscreenSelect
          label={ui("المعاملة الضريبية *")}
          required
          searchable={false}
          placeholder={ui("اختر المعاملة الضريبية")}
          value={value.category}
          onChange={(cat) => {
            onChange({
              category: cat,
              rate: cat === "S" ? "15" : "0",
              ...(cat === "S"
                ? { exemptionCode: undefined, exemptionReason: undefined }
                : {}),
            });
          }}
          options={TAX_OPTIONS.map((opt) => ({
            value: opt.code,
            label: ui(opt.label),
            description: ui(opt.hint),
            badge: `${opt.rate}%`,
          }))}
        />
      </div>

      {/* Exemption Fields if Zero or Exempt */}
      {hasExemption && (
        <div className="grid gap-4 rounded-xl border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)] p-4 sm:grid-cols-2">
          <ExpandableField
            label={ui("رمز الإعفاء الضريبي الرسمي *")}
            dir="ltr"
            maxLength={100}
            placeholder={ui("مثال: VATEX-SA-32 أو VATEX-SA-35")}
            value={value.exemptionCode || ""}
            onApply={(exemptionCode) => onChange({ exemptionCode })}
          >
            <input
              required
              maxLength={100}
              dir="ltr"
              className={`${INLINE_INPUT} font-mono`}
              placeholder={ui("مثال: VATEX-SA-32 أو VATEX-SA-35")}
              value={value.exemptionCode || ""}
              onChange={(e) => onChange({ exemptionCode: e.target.value })}
            />
          </ExpandableField>
          <ExpandableField
            label={ui("سبب الإعفاء أو النسبة الصفرية بالعربية")}
            required
            maxLength={200}
            placeholder={ui("مثال: توريد خدمات نقل دولي خارج حدود المملكة")}
            value={value.exemptionReason || ""}
            onApply={(exemptionReason) => onChange({ exemptionReason })}
          >
            <input
              required
              maxLength={200}
              className={INLINE_INPUT}
              placeholder={ui("مثال: توريد خدمات نقل دولي خارج حدود المملكة")}
              value={value.exemptionReason || ""}
              onChange={(e) => onChange({ exemptionReason: e.target.value })}
            />
          </ExpandableField>
        </div>
      )}

      {/* Expand for Discount & Details */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setIsExpanded(!isExpanded)}
          className="min-h-11 sm:min-h-9 flex items-center gap-1.5 rounded-lg py-1 text-xs sm:text-sm font-bold text-[var(--text-muted)] hover:text-[var(--accent-gold)] cursor-pointer transition-colors"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          <span>{ui("تطبيق خصم أو تفاصيل توريد إضافية")}</span>
          <ChevronDown
            className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        <p className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
          {ui("إجمالي هذا البند (شامل الضريبة):")}{" "}
          <b
            className="ms-1 font-mono text-sm sm:text-base text-[var(--text-main)]"
            dir="ltr"
          >
            {amount || "—"}
          </b>{" "}
          <span className="text-[var(--accent-gold)]">
            {ui("ر.س")}
          </span>
        </p>
      </div>

      {expanded && (
        <div className="grid gap-4 border-t theme-border pt-4 sm:grid-cols-3">
          {/* Service Code */}
          <ExpandableField
            label={ui("رمز الخدمة (الكود الداخلي)")}
            required
            dir="ltr"
            maxLength={200}
            value={value.code}
            onApply={(code) => onChange({ code })}
          >
            <input
              required
              dir="ltr"
              maxLength={200}
              className={`${INLINE_INPUT} font-mono`}
              value={value.code}
              onChange={(e) => onChange({ code: e.target.value })}
            />
          </ExpandableField>

          {/* Discount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)]">
              <span>{ui("الخصم")}</span>
              <FullscreenSelect
                ariaLabel={ui(`نوع الخصم للخدمة ${index + 1}`)}
                searchable={false}
                triggerClassName="min-h-10 sm:min-h-8 rounded-lg px-2.5 py-1 text-xs font-semibold"
                value={discountMode}
                onChange={(nextMode) => {
                  const mode = nextMode as "AMOUNT" | "PERCENT";
                  setDiscountMode(mode);
                  if (mode === "PERCENT") {
                    onChange({
                      discount:
                        percentageDiscount(
                          value.quantity,
                          value.unitPrice,
                          discountPercent,
                        ) || "0",
                    });
                  }
                }}
                options={[
                  { value: "AMOUNT", label: ui("مبلغ خصم (ر.س)") },
                  { value: "PERCENT", label: ui("نسبة مئوية (%)") },
                ]}
              />
            </div>
            <input
              aria-label={ui(`قيمة الخصم للخدمة ${index + 1}`)}
              inputMode="decimal"
              dir="ltr"
              pattern={
                discountMode === "PERCENT"
                  ? "(?:100(?:[.]0{1,2})?|0?[0-9]{1,2}(?:[.][0-9]{1,2})?)"
                  : "[0-9]{1,10}([.][0-9]{1,2})?"
              }
              className={`${INLINE_INPUT} font-mono ${isMobile ? "cursor-pointer" : ""}`}
              value={
                discountMode === "PERCENT" ? discountPercent : value.discount
              }
              onClick={openDiscountExpand}
              onKeyDown={(e) => {
                if (isMobile && e.key === "F2") {
                  e.preventDefault();
                  openDiscountExpand();
                }
              }}
              onChange={(e) => {
                if (discountMode === "PERCENT") {
                  setDiscountPercent(e.target.value);
                  onChange({
                    discount:
                      percentageDiscount(
                        value.quantity,
                        value.unitPrice,
                        e.target.value,
                      ) || "0",
                  });
                } else {
                  onChange({ discount: e.target.value });
                }
              }}
            />

            {isMobile && (
              <FullscreenFieldModal
                open={discountExpandOpen}
                onClose={() => setDiscountExpandOpen(false)}
                sessionKey={discountExpandSession}
                title={ui("الخصم")}
                value={
                  discountMode === "PERCENT" ? discountPercent : value.discount
                }
                inputMode="decimal"
                dir="ltr"
                pattern={
                  discountMode === "PERCENT"
                    ? "(?:100(?:[.]0{1,2})?|0?[0-9]{1,2}(?:[.][0-9]{1,2})?)"
                    : "[0-9]{1,10}([.][0-9]{1,2})?"
                }
                onApply={(next) => {
                  if (discountMode === "PERCENT") {
                    setDiscountPercent(next);
                    onChange({
                      discount:
                        percentageDiscount(
                          value.quantity,
                          value.unitPrice,
                          next,
                        ) || "0",
                    });
                  } else {
                    onChange({ discount: next });
                  }
                }}
              />
            )}
          </div>

          {/* Component */}
          <FullscreenSelect
            label={ui("طبيعة التوريد")}
            required
            searchable={false}
            placeholder={ui("اختر طبيعة التوريد")}
            value={value.component}
            onChange={(component) => onChange({ component })}
            options={Object.entries(COMPONENTS).map(([k, label]) => ({
              value: k,
              label: ui(label),
            }))}
          />
        </div>
      )}
    </fieldset>
  );
}
