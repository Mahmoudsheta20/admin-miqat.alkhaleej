"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  ReceiptText,
  X,
} from "lucide-react";
import { useUiText } from "@/lib/ui-text";
import CustomerPicker from "@/app/_components/commercial/customer-picker";
import { ExpandableField } from "@/app/_components/form/FullscreenFieldModal";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";
import { invoicePhoneFrom, type InvoicePhone } from "@/lib/invoice-phone";
import type { InvoiceBooking } from "@/lib/invoice-booking";
import type { TransportDetails } from "@/lib/invoice-transport";
import type {
  InvoiceDetail,
  InvoiceDocumentType,
  TaxDocument,
  TaxOriginalRow,
} from "@/lib/invoices";
import InvoiceTypeSelector, {
  type UnifiedDocChoice,
} from "./invoice-type-selector";
import InvoicePhoneField from "./invoice-phone-field";
import ContractPicker, { type InvoiceContractOption } from "./contract-picker";
import {
  amount,
  INLINE_INPUT,
  type BuyerForm,
} from "./invoice-form-types";

interface StageDocumentCustomerProps {
  documentType: InvoiceDocumentType;
  taxDocument: TaxDocument;
  isTaxMode: boolean;
  sellerMissingTax: boolean;
  original: InvoiceDetail | null;
  origSearch: string;
  origOptions: TaxOriginalRow[];
  origSearchError: string;
  selectedOrigSummary?: TaxOriginalRow;
  creditCapError: string;
  selectedContract: InvoiceContractOption | null;
  isSourceLoading: boolean;
  sourceError: string;
  customerId: string;
  buyer: BuyerForm;
  showBuyerDetails: boolean;
  phone: InvoicePhone;
  booking: InvoiceBooking;
  transport: TransportDetails;
  inModal: boolean;
  onClose?: () => void;
  onDocChoice: (choice: UnifiedDocChoice) => void;
  onSwitchCustomerSubtype: (subtype: "TAX" | "BOOKING") => void;
  onChangeTaxProfile: (profile: "SIMPLIFIED" | "STANDARD") => void;
  onUpdateTaxDocument: (updater: (prev: TaxDocument) => TaxDocument) => void;
  onOrigSearchChange: (q: string) => void;
  onSelectOriginal: (id: string) => void;
  onSelectContract: (c: InvoiceContractOption) => void;
  onClearContract: () => void;
  onSelectCustomer: (
    customerId: string,
    patch?: {
      buyer: BuyerForm;
      phone?: InvoicePhone;
      profile: "SIMPLIFIED" | "STANDARD";
    },
  ) => void;
  onUpdateBuyer: (change: Partial<BuyerForm>) => void;
  onToggleBuyerDetails: () => void;
  onChangePhone: (v: InvoicePhone) => void;
  onUpdateBooking: (change: Partial<InvoiceBooking>) => void;
  onUpdateTransport: (change: Partial<TransportDetails>) => void;
  onNext: () => void;
}

export default function StageDocumentCustomer({
  documentType,
  taxDocument,
  isTaxMode,
  sellerMissingTax,
  original,
  origSearch,
  origOptions,
  origSearchError,
  selectedOrigSummary,
  creditCapError,
  selectedContract,
  isSourceLoading,
  sourceError,
  customerId,
  buyer,
  showBuyerDetails,
  phone,
  booking,
  transport,
  inModal,
  onClose,
  onDocChoice,
  onSwitchCustomerSubtype,
  onChangeTaxProfile,
  onUpdateTaxDocument,
  onOrigSearchChange,
  onSelectOriginal,
  onSelectContract,
  onClearContract,
  onSelectCustomer,
  onUpdateBuyer,
  onToggleBuyerDetails,
  onChangePhone,
  onUpdateBooking,
  onUpdateTransport,
  onNext,
}: StageDocumentCustomerProps) {
  const ui = useUiText();
  const text = (ar: string, en: string) => (ui.language === "en" ? en : ar);

  const showAdvancedDocDefault =
    documentType === "BOOKING" ||
    taxDocument.kind !== "INVOICE" ||
    sellerMissingTax;

  return (
    <div className="space-y-5">
      {/* 1a. Unified Document Selector */}
      <InvoiceTypeSelector
        documentType={documentType}
        taxKind={taxDocument.kind}
        onChangeType={onDocChoice}
      />

      {/* Seller Readiness Alert */}
      {sellerMissingTax && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs sm:text-sm text-amber-900 dark:text-amber-300 flex flex-wrap items-center justify-between gap-3"
        >
          <span className="font-bold">
            {text(
              "بيانات المنشأة الضريبية غير مكتملة (الرقم الضريبي أو السجل التجاري أو العنوان الوطني). يلزم إكمالها لحفظ المستند الضريبي.",
              "Seller tax identity is incomplete (VAT, CRN, or National Address). Complete Company Settings before issuing a tax document.",
            )}
          </span>
          <Link
            href="/admin/invoices/settings"
            className="inline-flex min-h-9 items-center rounded-lg border border-current/30 px-3 py-1 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            {text("إكمال إعدادات الشركة", "Company Settings")}
          </Link>
        </div>
      )}

      {/* 1b. If Credit or Debit Note, choose Original Invoice and Reason */}
      {isTaxMode && taxDocument.kind !== "INVOICE" && (
        <section className="theme-card rounded-2xl p-4 sm:p-5 border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)]">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="rounded-md bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] px-2.5 py-0.5 text-xs font-semibold">
              {ui("ربط الفاتورة الأصلية للإشعار")}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-3.5 leading-relaxed">
            {ui(
              "يُشترط نظاماً ربط الإشعار برقم الفاتورة الصادرة سابقاً. سيتم نسخ بيانات العميل والمسار والضريبة تلقائياً.",
            )}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FullscreenSelect
                label={ui("الفاتورة الأصلية")}
                required
                searchable
                columns={2}
                clearable
                searchValue={origSearch}
                onSearchChange={onOrigSearchChange}
                searchPlaceholder={ui("رقم الفاتورة أو اسم العميل")}
                placeholder={ui("اختر الفاتورة الأصلية")}
                value={taxDocument.originalInvoiceId || ""}
                onChange={onSelectOriginal}
                error={origSearchError ? ui(origSearchError) : undefined}
                options={[
                  ...(original &&
                  !origOptions.some((o) => o.id === original.id)
                    ? [
                        {
                          value: original.id,
                          label: `${original.invoiceNumber} · ${original.customerName}`,
                          badge: original.invoiceNumber,
                        },
                      ]
                    : []),
                  ...origOptions.map((item) => ({
                    value: item.id,
                    label:
                      taxDocument.kind === "CREDIT"
                        ? `${item.invoiceNumber} · ${item.customerName} (${text("المتاح للتخفيض", "Avail.")}: ${item.remainingGross} SAR)`
                        : `${item.invoiceNumber} · ${item.customerName} (${item.totalAmount} SAR)`,
                    badge: item.invoiceNumber,
                    keywords: `${item.invoiceNumber} ${item.customerName}`,
                  })),
                ]}
              />
            </div>
            <div className="sm:col-span-2">
              <ExpandableField
                label={ui("سبب إصدار هذا الإشعار بالعربية")}
                required
                maxLength={200}
                placeholder={ui(
                  taxDocument.kind === "CREDIT"
                    ? "مثال: خصم تجاري ممنوح أو إلغاء رحلة جزئياً"
                    : "مثال: رسوم جولة إضافية وتمديد ساعات الخدمة",
                )}
                value={taxDocument.adjustmentReason || ""}
                onApply={(adjustmentReason) =>
                  onUpdateTaxDocument((prev) => ({ ...prev, adjustmentReason }))
                }
              >
                <input
                  required
                  maxLength={200}
                  className={INLINE_INPUT}
                  placeholder={ui(
                    taxDocument.kind === "CREDIT"
                      ? "مثال: خصم تجاري ممنوح أو إلغاء رحلة جزئياً"
                      : "مثال: رسوم جولة إضافية وتمديد ساعات الخدمة",
                  )}
                  value={taxDocument.adjustmentReason || ""}
                  onChange={(e) =>
                    onUpdateTaxDocument((prev) => ({
                      ...prev,
                      adjustmentReason: e.target.value,
                    }))
                  }
                />
              </ExpandableField>
            </div>
          </div>
          {original && (
            <div className="mt-3.5 space-y-2.5">
              <div className="rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--bg-card)] p-3.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ReceiptText className="size-4 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-bold text-[var(--text-main)]">
                      {ui("الفاتورة الأصلية المرتبطة")}: {original.invoiceNumber}
                    </span>
                    <span className="text-[var(--text-muted)] ms-2">
                      ({original.customerName} · {amount(original.snapshot.totals.gross)} {ui("ر.س")})
                    </span>
                    {taxDocument.kind === "CREDIT" &&
                      (original.creditBalance || selectedOrigSummary) && (
                        <span
                          className="block text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 font-mono"
                          dir="ltr"
                        >
                          {text("المتاح للإشعار الدائن", "Remaining creditable")}:{" "}
                          {original.creditBalance?.availableGross ??
                            selectedOrigSummary?.remainingGross}{" "}
                          {text("ر.س", "SAR")}
                        </span>
                      )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectOriginal("")}
                  className="min-h-11 sm:min-h-8 inline-flex items-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--text-main)] hover:border-rose-500 hover:text-rose-600 transition cursor-pointer"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  <span>{ui("تغيير")}</span>
                </button>
              </div>
              {creditCapError && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300"
                >
                  {creditCapError}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* 1c. Customer & Contract Import Card (with clean B2C/B2B toggle + tucked advanced doc options) */}
      <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b theme-border pb-3.5 mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
              {ui("بيانات العميل والفاتورة")}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
              {ui(
                "اختر العقد لاستيراد كافة بيانات الرحلة والعميل بضغطة زر، أو أدخلها يدوياً",
              )}
            </p>
          </div>

          {isTaxMode && (
            <div
              role="group"
              aria-label={text("نموذج الفاتورة الضريبية", "Tax Invoice Profile")}
              className="inline-flex rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] p-1 gap-1"
            >
              {(
                [
                  ["SIMPLIFIED", text("أفراد (مبسطة)", "Individual (B2C)")],
                  ["STANDARD", text("شركة / منشأة (B2B)", "Company (B2B)")],
                ] as const
              ).map(([profile, label]) => (
                <button
                  key={profile}
                  type="button"
                  disabled={Boolean(original)}
                  aria-pressed={taxDocument.profile === profile}
                  onClick={() => onChangeTaxProfile(profile)}
                  className={`min-h-9 rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer disabled:opacity-60 ${
                    taxDocument.profile === profile
                      ? "bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/45"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contract Picker */}
        <div className="mb-5 pb-5 border-b theme-border">
          <ContractPicker
            selected={selectedContract}
            isLoading={isSourceLoading}
            onSelect={onSelectContract}
            onClear={onClearContract}
          />
          {sourceError && (
            <p
              role="alert"
              className="mt-2 text-sm font-bold text-rose-700 dark:text-rose-400"
            >
              {ui(sourceError)}
            </p>
          )}
          {selectedContract && (
            <div className="mt-3.5 rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)] flex items-center justify-center shrink-0">
                  <FileText className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-main)]">
                      {ui("تم استيراد العقد")}: {selectedContract.referenceNumber}
                    </span>
                    <span className="rounded-md border theme-border bg-[var(--bg-card)] px-1.5 py-0.5 font-mono text-xs font-semibold text-[var(--text-main)]">
                      {selectedContract.tripDate}
                    </span>
                  </div>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">
                    {selectedContract.customerName} · {selectedContract.origin}{" "}
                    {ui.dir === "rtl" ? "←" : "→"} {selectedContract.destination}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClearContract}
                className="min-h-11 sm:min-h-8 inline-flex items-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-2.5 py-1 text-xs font-bold text-[var(--text-main)] hover:border-rose-500 hover:text-rose-600 transition cursor-pointer"
              >
                <X className="size-3.5" aria-hidden="true" />
                <span>{ui("إلغاء الربط")}</span>
              </button>
            </div>
          )}
        </div>

        {!original && (
          <div className="mb-5">
            <CustomerPicker
              value={customerId}
              onSelect={(c) => {
                if (!c) {
                  onSelectCustomer("");
                  return;
                }
                onSelectCustomer(c.id, {
                  buyer: {
                    name: c.name || "",
                    vatNumber: c.vatNumber || "",
                    commercialRegistration: c.identification || "",
                    street: c.address?.street || "",
                    building: c.address?.building || "",
                    district: c.address?.district || "",
                    city: c.address?.city || "",
                    postalCode: c.address?.postalCode || "",
                  },
                  phone: c.phone ? invoicePhoneFrom(c.phone) : undefined,
                  profile: c.type === "COMPANY" ? "STANDARD" : "SIMPLIFIED",
                });
              }}
            />
          </div>
        )}

        {/* Customer Information Grid */}
        <div className="grid gap-5 sm:grid-cols-2">
          <ExpandableField
            label={ui("الفاتورة باسم (العميل أو المنشأة)")}
            required
            maxLength={200}
            autoComplete="name"
            disabled={Boolean(original)}
            placeholder={ui("اسم الفرد، الفندق، أو الشركة")}
            value={buyer.name || ""}
            onApply={(name) => onUpdateBuyer({ name: name || "" })}
          >
            <input
              name="customerName"
              readOnly={Boolean(original)}
              required
              maxLength={200}
              autoComplete="name"
              placeholder={ui("اسم الفرد، الفندق، أو الشركة")}
              className={INLINE_INPUT}
              value={buyer.name || ""}
              onChange={(e) => onUpdateBuyer({ name: e.target.value })}
            />
          </ExpandableField>

          <ExpandableField
            label={ui("الرقم الضريبي للمشتري (للمنشآت B2B)")}
            inputMode="numeric"
            pattern="3\d{13}3"
            maxLength={15}
            dir="ltr"
            disabled={Boolean(original)}
            placeholder={ui("3xxxxxxxxxxxxxx3 (15 رقماً)")}
            value={buyer.vatNumber || ""}
            onApply={(vatNumber) => onUpdateBuyer({ vatNumber: vatNumber || "" })}
          >
            <input
              name="customerVat"
              readOnly={Boolean(original)}
              inputMode="numeric"
              pattern="3\d{13}3"
              maxLength={15}
              dir="ltr"
              placeholder={ui("3xxxxxxxxxxxxxx3 (15 رقماً)")}
              className={`${INLINE_INPUT} font-mono`}
              value={buyer.vatNumber || ""}
              onChange={(e) => onUpdateBuyer({ vatNumber: e.target.value })}
            />
          </ExpandableField>

          <ExpandableField
            label={ui("اسم الضيف أو مسؤول المجموعة (اختياري)")}
            maxLength={160}
            autoComplete="name"
            placeholder={ui("إذا كان مختلفاً عن صاحب الفاتورة")}
            value={transport.contactName || ""}
            onApply={(contactName) =>
              onUpdateTransport({ contactName: contactName || "" })
            }
          >
            <input
              maxLength={160}
              autoComplete="name"
              placeholder={ui("إذا كان مختلفاً عن صاحب الفاتورة")}
              className={INLINE_INPUT}
              value={transport.contactName || ""}
              onChange={(e) =>
                onUpdateTransport({ contactName: e.target.value })
              }
            />
          </ExpandableField>

          {/* Phone with Country Code */}
          <div>
            <span className="block text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)] mb-1">
              {ui("رقم الجوال للتواصل والفاتورة *")}
            </span>
            <InvoicePhoneField value={phone} onChange={onChangePhone} />
          </div>

          <ExpandableField
            label={ui("البريد الإلكتروني (اختياري)")}
            type="email"
            maxLength={160}
            dir="ltr"
            placeholder="customer@example.com"
            value={booking.email || ""}
            onApply={(email) => onUpdateBooking({ email: email || "" })}
          >
            <input
              type="email"
              maxLength={160}
              dir="ltr"
              placeholder="customer@example.com"
              className={INLINE_INPUT}
              value={booking.email || ""}
              onChange={(e) => onUpdateBooking({ email: e.target.value })}
            />
          </ExpandableField>

          <ExpandableField
            label={ui("عدد الركاب في الرحلة")}
            required
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            placeholder={ui("مثال: 4 ركاب")}
            value={
              transport.passengerCount !== undefined &&
              transport.passengerCount !== null
                ? String(transport.passengerCount)
                : ""
            }
            onApply={(next) => {
              const trimmed = next.trim();
              const parsed = Number(trimmed);
              onUpdateTransport({
                passengerCount:
                  trimmed && Number.isFinite(parsed) ? parsed : undefined,
              });
            }}
          >
            <input
              required
              type="number"
              min={1}
              max={100}
              step={1}
              placeholder={ui("مثال: 4 ركاب")}
              className={`${INLINE_INPUT} font-mono`}
              value={
                transport.passengerCount !== undefined &&
                transport.passengerCount !== null
                  ? transport.passengerCount
                  : ""
              }
              onChange={(e) =>
                onUpdateTransport({
                  passengerCount: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            />
          </ExpandableField>
        </div>

        {/* Commercial Registration if Tax Mode */}
        {isTaxMode && (
          <div className="mt-5">
            <ExpandableField
              label={ui("رقم السجل التجاري للعميل (اختياري)")}
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              dir="ltr"
              disabled={Boolean(original)}
              placeholder={ui("10 أرقام")}
              value={
                original
                  ? original.snapshot.input.buyer.identification || ""
                  : buyer.commercialRegistration || ""
              }
              onApply={(commercialRegistration) =>
                onUpdateBuyer({
                  commercialRegistration: commercialRegistration || "",
                })
              }
            >
              <input
                readOnly={Boolean(original)}
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                dir="ltr"
                placeholder={ui("10 أرقام")}
                className={`${INLINE_INPUT} font-mono`}
                value={
                  original
                    ? original.snapshot.input.buyer.identification || ""
                    : buyer.commercialRegistration || ""
                }
                onChange={(e) =>
                  onUpdateBuyer({
                    commercialRegistration: e.target.value,
                  })
                }
              />
            </ExpandableField>
          </div>
        )}

        {/* National Address: auto-opened if B2B/VAT or toggleable */}
        <div className="mt-4 pt-3.5 border-t theme-border">
          <button
            type="button"
            aria-expanded={showBuyerDetails}
            className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 py-1 text-xs sm:text-sm font-bold text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition cursor-pointer"
            onClick={onToggleBuyerDetails}
          >
            <span>
              {ui(
                buyer.vatNumber || taxDocument.profile === "STANDARD"
                  ? "العنوان الوطني للمشتري (مطلوب للفواتير الضريبية B2B)"
                  : "عنوان العميل الوطني (اختياري)",
              )}
            </span>
            <ChevronDown
              className={`size-4 transition-transform ${showBuyerDetails ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {showBuyerDetails && (
            <div className="mt-3 grid gap-4 border theme-border rounded-xl p-4 sm:grid-cols-2 bg-[var(--bg-card-subtle)]">
              {(
                [
                  { key: "street", label: "اسم الشارع" },
                  {
                    key: "building",
                    label: "رقم المبنى (٤ أرقام)",
                    pattern: "\\d{4}",
                  },
                  { key: "district", label: "الحي" },
                  { key: "city", label: "المدينة" },
                  {
                    key: "postalCode",
                    label: "الرمز البريدي (٥ أرقام)",
                    pattern: "\\d{5}",
                  },
                ] as const
              ).map((field) => (
                <ExpandableField
                  key={field.key}
                  label={ui(field.label)}
                  maxLength={200}
                  pattern={"pattern" in field ? field.pattern : undefined}
                  disabled={Boolean(original)}
                  value={buyer[field.key] || ""}
                  onApply={(next) => onUpdateBuyer({ [field.key]: next || "" })}
                >
                  <input
                    readOnly={Boolean(original)}
                    maxLength={200}
                    className={INLINE_INPUT}
                    value={buyer[field.key] || ""}
                    pattern={"pattern" in field ? field.pattern : undefined}
                    onChange={(e) =>
                      onUpdateBuyer({ [field.key]: e.target.value })
                    }
                  />
                </ExpandableField>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Document Options (Booking Invoice mode + Supply Date + Adjustment Event Date) */}
        {(documentType !== "PROFORMA" || isTaxMode) && (
          <details
            open={showAdvancedDocDefault}
            className="mt-4 pt-3.5 border-t theme-border"
          >
            <summary className="min-h-11 sm:min-h-9 inline-flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-bold text-[var(--text-muted)] hover:text-[var(--accent-gold)]">
              <span>
                {text("خيارات المستند المتقدمة (نوع الفاتورة الداخلية وتاريخ التوريد)", "Advanced document options (booking mode & supply date)")}
              </span>
            </summary>
            <div className="mt-3 rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4 space-y-4">
              {taxDocument.kind === "INVOICE" && documentType !== "PROFORMA" && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)] block">
                      {text("نوع فاتورة العميل", "Customer Invoice Mode")}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {documentType === "TAX"
                        ? text(
                            "فاتورة ضريبية معتمدة مع رمز ZATCA QR وقابلة لإصدار إشعارات دائن ومدين.",
                            "Tax invoice with official ZATCA QR and Credit/Debit note support.",
                          )
                        : text(
                            "فاتورة حجز داخلية للرحلة دون رمز ضريبي ZATCA.",
                            "Internal booking invoice without ZATCA QR.",
                          )}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      aria-pressed={documentType === "TAX"}
                      onClick={() => onSwitchCustomerSubtype("TAX")}
                      className={`min-h-11 sm:min-h-9 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        documentType === "TAX"
                          ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                          : "border-[var(--control-border)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--accent-gold)]/60"
                      }`}
                    >
                      {text("فاتورة ضريبية (ZATCA QR)", "Tax Invoice (ZATCA)")}
                    </button>
                    <button
                      type="button"
                      aria-pressed={documentType === "BOOKING"}
                      onClick={() => onSwitchCustomerSubtype("BOOKING")}
                      className={`min-h-11 sm:min-h-9 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        documentType === "BOOKING"
                          ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                          : "border-[var(--control-border)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--accent-gold)]/60"
                      }`}
                    >
                      {text("فاتورة حجز", "Booking Invoice")}
                    </button>
                  </div>
                </div>
              )}

              {isTaxMode && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)] block">
                    <span className="block mb-1">
                      {text("تاريخ التوريد *", "Supply Date *")}
                    </span>
                    <input
                      type="date"
                      required
                      dir="ltr"
                      value={taxDocument.supplyDate}
                      onChange={(e) =>
                        onUpdateTaxDocument((current) => ({
                          ...current,
                          supplyDate: e.target.value,
                        }))
                      }
                      className={`${INLINE_INPUT} font-mono`}
                    />
                  </label>

                  {taxDocument.kind !== "INVOICE" && (
                    <label className="text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)] block">
                      <span className="block mb-1">
                        {text("تاريخ واقعة الإشعار (اختياري)", "Adjustment Event Date")}
                      </span>
                      <input
                        type="date"
                        dir="ltr"
                        value={taxDocument.adjustmentEventDate || ""}
                        onChange={(e) =>
                          onUpdateTaxDocument((current) => ({
                            ...current,
                            adjustmentEventDate: e.target.value || undefined,
                          }))
                        }
                        className={`${INLINE_INPUT} font-mono`}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          </details>
        )}
      </section>

      {/* Stage 1 Footer Button */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
        {inModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 sm:min-h-9 items-center justify-center rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-main)] hover:border-[var(--accent-gold)] transition cursor-pointer"
          >
            {ui("إلغاء")}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center justify-center gap-2 rounded-lg px-5 py-1.5 text-xs sm:text-sm font-semibold cursor-pointer shadow-sm hover:shadow-md transition"
        >
          <span>{ui("المتابعة: مسار الرحلة والخدمة")}</span>
          <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
