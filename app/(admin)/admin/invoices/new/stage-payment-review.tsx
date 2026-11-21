"use client";

import {
  ArrowRight,
  ChevronDown,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Save,
  Wallet,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useUiText } from "@/lib/ui-text";
import type { InvoiceDocumentType } from "@/lib/invoices";
import type { TransportDetails } from "@/lib/invoice-transport";
import { ExpandableField } from "@/app/_components/form/FullscreenFieldModal";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";
import AutoSendWhatsAppCard from "@/app/_components/AutoSendWhatsAppCard";
import { INLINE_INPUT, INPUT, type BuyerForm, type FormLine } from "./invoice-form-types";

interface StagePaymentReviewProps {
  documentType: InvoiceDocumentType;
  isCreditNote: boolean;
  paymentStatusChoice: "NOT_PAID" | "FULLY_PAID" | "PARTIALLY_PAID";
  fullPaymentMethod: "BANK_TRANSFER" | "CASH" | "CARD";
  partialPaymentAmount: string;
  partialPaymentMethod: "BANK_TRANSFER" | "CASH";
  showAccountantDetails: boolean;
  revenueAccountCode: string;
  settlementAccountCode: string;
  buyer: BuyerForm;
  contactPhone: string;
  transport: TransportDetails;
  invoiceDate: string;
  estimateGross: string;
  remainingBalance: string;
  rows: FormLine[];
  lineEstimates: { gross: string }[];
  autoSendWhatsApp: boolean;
  whatsAppPhoneOverride: string;
  whatsAppMeta: { connected: boolean; adminFlowPhone: string } | null;
  isReviewed: boolean;
  isSaving: boolean;
  canSave: boolean;
  onChangePaymentStatusChoice: (
    choice: "NOT_PAID" | "FULLY_PAID" | "PARTIALLY_PAID",
  ) => void;
  onChangeFullPaymentMethod: (method: "BANK_TRANSFER" | "CASH" | "CARD") => void;
  onChangePartialPaymentAmount: (val: string) => void;
  onChangePartialPaymentMethod: (method: "BANK_TRANSFER" | "CASH") => void;
  onToggleAccountantDetails: () => void;
  onChangeRevenueAccount: (code: string) => void;
  onChangeSettlementAccount: (code: string) => void;
  onChangeInvoiceDate: (val: string) => void;
  onEditPricingStage: () => void;
  onAutoSendWhatsAppChange: (checked: boolean) => void;
  onWhatsAppPhoneChange: (val: string) => void;
  onChangeReviewed: (checked: boolean) => void;
  onBack: () => void;
}

export default function StagePaymentReview({
  documentType,
  isCreditNote,
  paymentStatusChoice,
  fullPaymentMethod,
  partialPaymentAmount,
  partialPaymentMethod,
  showAccountantDetails,
  revenueAccountCode,
  settlementAccountCode,
  buyer,
  contactPhone,
  transport,
  invoiceDate,
  estimateGross,
  remainingBalance,
  rows,
  lineEstimates,
  autoSendWhatsApp,
  whatsAppPhoneOverride,
  whatsAppMeta,
  isReviewed,
  isSaving,
  canSave,
  onChangePaymentStatusChoice,
  onChangeFullPaymentMethod,
  onChangePartialPaymentAmount,
  onChangePartialPaymentMethod,
  onToggleAccountantDetails,
  onChangeRevenueAccount,
  onChangeSettlementAccount,
  onChangeInvoiceDate,
  onEditPricingStage,
  onAutoSendWhatsAppChange,
  onWhatsAppPhoneChange,
  onChangeReviewed,
  onBack,
}: StagePaymentReviewProps) {
  const ui = useUiText();
  const text = (ar: string, en: string) => (ui.language === "en" ? en : ar);

  const accountingSummary =
    paymentStatusChoice === "FULLY_PAID"
      ? fullPaymentMethod === "CASH"
        ? text("توجيه تلقائي · تحصيل نقدي بالصندوق", "Automatic · Petty cash collection")
        : text("توجيه تلقائي · تحصيل عبر البنك", "Automatic · Bank transfer collection")
      : paymentStatusChoice === "PARTIALLY_PAID"
        ? text("توجيه تلقائي · دفعة مقدمة + متبقي على العميل", "Automatic · Partial receipt + customer balance")
        : text("توجيه تلقائي · آجل على حساب العميل", "Automatic · Deferred on customer account");

  return (
    <div className="space-y-5">
      {/* 4a. The User Question: "هل دفع العميل؟" */}
      {documentType !== "PROFORMA" ? (
        <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
          <div className="border-b theme-border pb-3.5 mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)] flex items-center gap-2">
              <Wallet
                className="size-4 sm:size-5 text-[var(--accent-gold)]"
                aria-hidden="true"
              />
              <span>
                {isCreditNote
                  ? text(
                      "كيف سيتم تسوية الإشعار الدائن مع العميل؟",
                      "How will the credit note be settled?",
                    )
                  : ui("هل دفع العميل قيمة الفاتورة؟")}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
              {isCreditNote
                ? text(
                    "اختر إما قيد المبلغ في رصيد العميل أو إثبات رده نقداً أو تحويلاً بنكياً.",
                    "Choose whether to apply to customer balance or record an immediate cash/bank refund.",
                  )
                : ui(
                    "حدد حالة تحصيل المبلغ الفعلي لتسجيل الدفعة وتوجيه القيود بدقة",
                  )}
            </p>
          </div>

          <div
            className={`grid gap-3 ${isCreditNote ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
          >
            {/* NOT PAID (آجل) */}
            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition text-start ${
                paymentStatusChoice === "NOT_PAID"
                  ? "bg-[var(--accent-surface)] border-[var(--accent-gold)]/55 ring-1 ring-[var(--accent-gold)]/30"
                  : "bg-[var(--bg-card)] border-[var(--control-border)] hover:border-[var(--accent-gold)]/55"
              }`}
            >
              <input
                type="radio"
                name="paymentStatusChoice"
                value="NOT_PAID"
                checked={paymentStatusChoice === "NOT_PAID"}
                onChange={() => onChangePaymentStatusChoice("NOT_PAID")}
                className="sr-only"
              />
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)]">
                  {isCreditNote
                    ? text("تخفيض ذمة / رصيد العميل", "Credit Customer Balance")
                    : ui("لم يدفع بعد (آجل)")}
                </span>
                <span className="size-4 rounded-full border border-[var(--accent-gold)] flex items-center justify-center">
                  {paymentStatusChoice === "NOT_PAID" && (
                    <span className="size-2 rounded-full bg-[var(--accent-gold)]" />
                  )}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {isCreditNote
                  ? text(
                      "يُخفض الرصيد القائم على الفاتورة الأصلية أو يُثبت كرصيد دائن للعميل.",
                      "Reduces receivable on the original invoice or leaves a credit balance for the customer.",
                    )
                  : ui(
                      "تُسجل الفاتورة على ذمة العميل وتظهر في قائمة المتبقي لمتابعتها لاحقاً.",
                    )}
              </p>
            </label>

            {/* FULLY PAID / IMMEDIATE REFUND */}
            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition text-start ${
                paymentStatusChoice === "FULLY_PAID"
                  ? "bg-[var(--accent-surface)] border-[var(--accent-gold)]/55 ring-1 ring-[var(--accent-gold)]/30"
                  : "bg-[var(--bg-card)] border-[var(--control-border)] hover:border-[var(--accent-gold)]/55"
              }`}
            >
              <input
                type="radio"
                name="paymentStatusChoice"
                value="FULLY_PAID"
                checked={paymentStatusChoice === "FULLY_PAID"}
                onChange={() => onChangePaymentStatusChoice("FULLY_PAID")}
                className="sr-only"
              />
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)]">
                  {isCreditNote
                    ? text("تم رد كامل المبلغ للعميل", "Refunded in Full Immediately")
                    : ui("دفع المبلغ كاملاً")}
                </span>
                <span className="size-4 rounded-full border border-[var(--accent-gold)] flex items-center justify-center">
                  {paymentStatusChoice === "FULLY_PAID" && (
                    <span className="size-2 rounded-full bg-[var(--accent-gold)]" />
                  )}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {isCreditNote
                  ? text(
                      "تم رد المبلغ للعميل مباشرة من البنك أو الصندوق عند إصدار الإشعار.",
                      "Direct refund paid out from Bank or Petty Cash on issuance.",
                    )
                  : ui(
                      "تم استلام كامل قيمة الفاتورة وتغذية حساب البنك أو الصندوق.",
                    )}
              </p>
            </label>

            {/* PARTIALLY PAID (hidden for Credit Notes) */}
            {!isCreditNote && (
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition text-start ${
                  paymentStatusChoice === "PARTIALLY_PAID"
                    ? "bg-sky-500/10 border-sky-600/45 ring-1 ring-sky-500/30"
                    : "bg-[var(--bg-card)] border-[var(--control-border)] hover:border-sky-600/55 dark:hover:border-sky-400/55"
                }`}
              >
                <input
                  type="radio"
                  name="paymentStatusChoice"
                  value="PARTIALLY_PAID"
                  checked={paymentStatusChoice === "PARTIALLY_PAID"}
                  onChange={() => onChangePaymentStatusChoice("PARTIALLY_PAID")}
                  className="sr-only"
                />
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)]">
                    {ui("دفع جزءاً من المبلغ")}
                  </span>
                  <span className="size-4 rounded-full border border-sky-600 dark:border-sky-400 flex items-center justify-center">
                    {paymentStatusChoice === "PARTIALLY_PAID" && (
                      <span className="size-2 rounded-full bg-sky-600 dark:bg-sky-400" />
                    )}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {ui("تسجيل دفعة مقدمة الآن مع بقاء الرصيد المتبقي للمتابعة.")}
                </p>
              </label>
            )}
          </div>

          {/* If FULLY PAID: choose bank or cash */}
          {paymentStatusChoice === "FULLY_PAID" && (
            <div className="mt-4 pt-3.5 border-t theme-border space-y-2.5">
              <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] block">
                {isCreditNote
                  ? text("كيف تم رد المبلغ للعميل؟", "How was the refund issued?")
                  : ui("كيف استلمت المبلغ من العميل؟")}
              </span>
              <div className="grid gap-2.5 sm:grid-cols-3">
                <label
                  className={`min-h-11 sm:min-h-9 p-2.5 rounded-lg border text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition ${
                    fullPaymentMethod === "BANK_TRANSFER"
                      ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                      : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="fullPaymentMethod"
                    checked={fullPaymentMethod === "BANK_TRANSFER"}
                    onChange={() => onChangeFullPaymentMethod("BANK_TRANSFER")}
                    className="size-4 accent-amber-700 dark:accent-amber-400"
                  />
                  <Landmark className="size-4 shrink-0" aria-hidden="true" />
                  <span>{ui("تحويل بنكي (البنك الأهلي SNB)")}</span>
                </label>
                <label
                  className={`min-h-11 sm:min-h-9 p-2.5 rounded-lg border text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition ${
                    fullPaymentMethod === "CASH"
                      ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                      : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="fullPaymentMethod"
                    checked={fullPaymentMethod === "CASH"}
                    onChange={() => onChangeFullPaymentMethod("CASH")}
                    className="size-4 accent-amber-700 dark:accent-amber-400"
                  />
                  <Wallet className="size-4 shrink-0" aria-hidden="true" />
                  <span>{ui("نقداً بالصندوق")}</span>
                </label>
                <label
                  className={`min-h-11 sm:min-h-9 p-2.5 rounded-lg border text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition ${
                    fullPaymentMethod === "CARD"
                      ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                      : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="fullPaymentMethod"
                    checked={fullPaymentMethod === "CARD"}
                    onChange={() => onChangeFullPaymentMethod("CARD")}
                    className="size-4 accent-amber-700 dark:accent-amber-400"
                  />
                  <CreditCard className="size-4 shrink-0" aria-hidden="true" />
                  <span>{ui("بطاقة مدى / دفع إلكتروني")}</span>
                </label>
              </div>
            </div>
          )}

          {/* If PARTIALLY PAID: input partial amount & method */}
          {paymentStatusChoice === "PARTIALLY_PAID" && (
            <div className="mt-5 pt-4 border-t theme-border grid gap-4 sm:grid-cols-2">
              <ExpandableField
                label={ui("المبلغ المدفوع مقدماً الآن (ر.س)")}
                required
                inputMode="decimal"
                dir="ltr"
                placeholder="0.00"
                value={partialPaymentAmount}
                onApply={onChangePartialPaymentAmount}
              >
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="0.00"
                  className={`${INLINE_INPUT} font-mono text-start`}
                  value={partialPaymentAmount}
                  onChange={(e) => onChangePartialPaymentAmount(e.target.value)}
                />
              </ExpandableField>
              <FullscreenSelect
                label={ui("طريقة استلام الدفعة الأولى")}
                searchable={false}
                value={partialPaymentMethod}
                onChange={(nextMethod) =>
                  onChangePartialPaymentMethod(
                    nextMethod as "BANK_TRANSFER" | "CASH",
                  )
                }
                options={[
                  {
                    value: "BANK_TRANSFER",
                    label: ui("تحويل بنكي / الحساب البنكي SNB"),
                  },
                  { value: "CASH", label: ui("نقداً في الصندوق") },
                ]}
              />
            </div>
          )}
        </section>
      ) : (
        <section className="theme-card rounded-2xl p-5 border border-sky-600/30 bg-sky-500/10">
          <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold text-sm">
            <FileSpreadsheet className="size-5" aria-hidden="true" />
            <span>{ui("فاتورة مبدئية (عرض أسعار)")}</span>
          </div>
          <p className="mt-1.5 text-sm text-[var(--text-main)] leading-relaxed">
            {ui(
              "الفاتورة المبدئية هي عرض سعر مبدئي لا يتطلب تسوية أو تحصيل في هذه المرحلة. يتم تأكيد الدفع عند إصدار الفاتورة الفعلية للعميل.",
            )}
          </p>
        </section>
      )}

      {/* 4b. Collapsible "تفاصيل للمحاسب (تلقائية)" */}
      {documentType !== "PROFORMA" && (
        <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
          <button
            type="button"
            aria-expanded={showAccountantDetails}
            onClick={onToggleAccountantDetails}
            className="flex min-h-11 sm:min-h-9 w-full items-center justify-between gap-3 text-start cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Landmark
                className="size-4 sm:size-5 text-[var(--text-muted)] shrink-0"
                aria-hidden="true"
              />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)]">
                  {ui("تفاصيل للمحاسب (تلقائية)")}
                </span>
                <p className="text-xs text-[var(--text-muted)]">
                  {accountingSummary}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`size-4 text-[var(--text-muted)] transition-transform shrink-0 ${showAccountantDetails ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {showAccountantDetails && (
            <div className="mt-4 pt-4 border-t theme-border grid gap-4 sm:grid-cols-2">
              <FullscreenSelect
                label={ui("حساب الإيراد")}
                searchable={false}
                value={revenueAccountCode}
                onChange={onChangeRevenueAccount}
                options={[
                  {
                    value: "4101",
                    label: ui("4101 · إيرادات خدمات النقل والمطارات"),
                    badge: "4101",
                  },
                  {
                    value: "4102",
                    label: ui("4102 · إيرادات كبار الشخصيات والعمرة والزيارة"),
                    badge: "4102",
                  },
                ]}
              />
              <FullscreenSelect
                label={ui("حساب التسوية المالية")}
                searchable={false}
                value={settlementAccountCode}
                onChange={onChangeSettlementAccount}
                options={[
                  {
                    value: "1103",
                    label: ui("1103 · ذمم العملاء (آجل)"),
                    badge: "1103",
                  },
                  {
                    value: "1102",
                    label: ui("1102 · البنك الأهلي السعودي - SNB"),
                    badge: "1102",
                  },
                  {
                    value: "1101",
                    label: ui("1101 · النقدية بالصندوق"),
                    badge: "1101",
                  },
                ]}
              />
              <p className="sm:col-span-2 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                {ui(
                  "يوجه النظام القيود تلقائياً بناءً على إجابتك في سؤال «هل دفع العميل؟». يمكنك تغيير الحساب هنا للمحاسبة المتقدمة فقط.",
                )}
              </p>
            </div>
          )}
        </section>
      )}

      {/* 4c. Pre-Issuance Summary & Review Card */}
      <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
        <div className="border-b theme-border pb-3.5 mb-4">
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
            {ui("مراجعة بيانات المستند قبل الإصدار")}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            {ui("تأكد من صحة المبالغ والمسار قبل الضغط على زر الإصدار")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
          <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
            <span className="text-[var(--text-muted)] block mb-1">
              {ui("العميل والمستند:")}
            </span>
            <p className="font-bold text-sm text-[var(--text-main)]">
              {buyer.name || "—"}
            </p>
            {contactPhone && (
              <p className="text-[var(--text-muted)] font-mono mt-0.5" dir="ltr">
                {contactPhone}
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
            <span className="text-[var(--text-muted)] block mb-1">
              {ui("مسار وموعد الرحلة:")}
            </span>
            <p className="font-bold text-sm text-[var(--text-main)]">
              {transport.origin || "—"} {ui.dir === "rtl" ? "←" : "→"}{" "}
              {transport.destination || "—"}
            </p>
            <p className="text-[var(--text-muted)] font-mono mt-0.5" dir="ltr">
              {transport.tripDate || "—"}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
            <span className="text-[var(--text-muted)] block mb-1">
              {ui("تاريخ ووقت الفاتورة:")}
            </span>
            <input
              required
              type="datetime-local"
              className={`${INPUT} font-mono`}
              value={invoiceDate}
              onChange={(e) => onChangeInvoiceDate(e.target.value)}
            />
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
            <span className="text-[var(--text-muted)] block mb-1">
              {ui("حالة السداد والمتبقي:")}
            </span>
            <p className="font-semibold font-mono text-sm">
              {documentType === "PROFORMA" ? (
                <span className="text-sky-700 dark:text-sky-300">
                  {text("عرض أسعار (لا يتطلب تحصيل)", "Proforma quote")}
                </span>
              ) : paymentStatusChoice === "FULLY_PAID" ? (
                <span className="text-[var(--accent-gold)]">
                  {ui("مدفوع بالكامل (٠.٠٠ متبقي)")}
                </span>
              ) : paymentStatusChoice === "PARTIALLY_PAID" ? (
                <span className="text-sky-700 dark:text-sky-300">
                  {ui("مدفوع:")} {partialPaymentAmount || "0"}{" "}
                  {ui("ر.س · متبقي:")} {remainingBalance} {ui("ر.س")}
                </span>
              ) : (
                <span className="text-[var(--accent-gold)]">
                  {ui("آجل بالكامل (المتبقي:")} {estimateGross} {ui("ر.س)")}
                </span>
              )}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border sm:col-span-2">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[var(--text-muted)]">
                {ui("الخدمات والضريبة:")}
              </span>
              <button
                type="button"
                onClick={onEditPricingStage}
                className="text-xs font-semibold text-[var(--accent-gold)] hover:underline cursor-pointer"
              >
                {ui("تعديل")}
              </button>
            </div>
            <div className="space-y-1.5">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
                >
                  <span
                    className={
                      row.input.description.trim()
                        ? "font-semibold text-[var(--text-main)]"
                        : "font-semibold text-rose-700 dark:text-rose-400"
                    }
                  >
                    {idx + 1}. {row.input.description.trim() || ui("بند بدون وصف")}
                  </span>
                  <span className="font-mono text-[var(--text-muted)]" dir="ltr">
                    {lineEstimates[idx]?.gross
                      ? `${lineEstimates[idx].gross} ${ui("ر.س")}`
                      : "—"}{" "}
                    ({row.input.rate || "0"}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Auto-Send Invoice via WhatsApp Option */}
        <div className="mt-4">
          <AutoSendWhatsAppCard
            checked={autoSendWhatsApp}
            onCheckedChange={onAutoSendWhatsAppChange}
            phone={whatsAppPhoneOverride}
            onPhoneChange={onWhatsAppPhoneChange}
            defaultPhoneHint={contactPhone || ""}
            recipientLabel={ui("هاتف العميل")}
            titleAr="إرسال الفاتورة تلقائياً للعميل عبر واتساب فور الإصدار"
            subtitleAr="عند التفعيل سيُرسل ملف الفاتورة (PDF) للعميل مع إخطار رقم الإدارة ضمن مسار التدفق، دون تعطيل حفظ الفاتورة إذا كان الواتساب غير متصل."
            waConnected={whatsAppMeta ? whatsAppMeta.connected : null}
            adminFlowPhone={whatsAppMeta?.adminFlowPhone}
            disabled={isSaving}
          />
        </div>

        {/* Review Checkbox */}
        <div className="mt-4 pt-3.5 border-t theme-border">
          <label
            id="review-checkbox-label"
            className={`flex min-h-11 sm:min-h-9 items-start gap-2.5 text-xs sm:text-sm leading-relaxed font-semibold cursor-pointer p-3 rounded-xl border transition ${
              isReviewed
                ? "border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] text-[var(--text-main)]"
                : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]/50"
            }`}
          >
            <Checkbox
              required
              checked={isReviewed}
              onChange={(e) => onChangeReviewed(e.target.checked)}
              className="mt-1 shrink-0"
            />
            <span>
              {ui(
                "أقر بأنني راجعت بيانات العميل والرحلة والأسعار والضريبة وهي صحيحة ومعتمدة للإصدار.",
              )}
            </span>
          </label>
        </div>
      </section>

      {/* Stage 4 Stepper Navigation & Primary Save Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-main)] transition cursor-pointer"
        >
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden="true" />
          <span>{ui("السابق")}</span>
        </button>

        <button
          id="invoice-submit-btn"
          type="submit"
          disabled={!canSave}
          className="gold-gradient-btn flex min-h-11 sm:min-h-9 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg px-6 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          <span>
            {ui(
              isSaving
                ? "جارٍ الإصدار والحفظ…"
                : documentType === "PROFORMA"
                  ? "حفظ الفاتورة المبدئية"
                  : "إصدار الفاتورة وتوليد PDF",
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
