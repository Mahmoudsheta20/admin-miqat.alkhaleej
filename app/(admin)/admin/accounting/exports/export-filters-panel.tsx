"use client";

import { useId } from "react";
import { AlertCircle, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  journalSourceTypeLabel,
  type Account,
} from "@/lib/accounting";
import type { FinancialExportFilters } from "@/lib/financial-exports";
import type { Vehicle } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";

const JOURNAL_SOURCES = [
  "MANUAL",
  "SALE",
  "PAYMENT",
  "PURCHASE",
  "TRIP_COMMISSION",
  "SALARY",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
] as const;

const CONTROL =
  "theme-input min-h-11 sm:min-h-9 w-full rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem]";

interface ExportFiltersPanelProps {
  open: boolean;
  filters: FinancialExportFilters;
  onChange: (patch: Partial<FinancialExportFilters>) => void;
  onReset: () => void;
  activeCount: number;
  cashAccounts: readonly Account[];
  allAccounts: readonly Account[];
  vehicles: readonly Vehicle[];
  amountRangeError: string;
  isEn: boolean;
}

export function ExportFiltersPanel({
  open,
  filters,
  onChange,
  onReset,
  activeCount,
  cashAccounts,
  allAccounts,
  vehicles,
  amountRangeError,
  isEn,
}: ExportFiltersPanelProps) {
  const uid = useId();
  const l = (ar: string, en: string) => (isEn ? en : ar);

  const activeTags: Array<{ key: string; label: string; clear: () => void }> = [];
  if (filters.invoiceType !== "ALL") {
    activeTags.push({
      key: "invType",
      label: `${l("نوع الفاتورة", "Invoice Type")}: ${filters.invoiceType}`,
      clear: () => onChange({ invoiceType: "ALL" }),
    });
  }
  if (filters.invoicePaymentStatus !== "ALL") {
    activeTags.push({
      key: "invPay",
      label: `${l("سداد الفاتورة", "Invoice Payment")}: ${filters.invoicePaymentStatus}`,
      clear: () => onChange({ invoicePaymentStatus: "ALL" }),
    });
  }
  if (filters.customerSearch.trim()) {
    activeTags.push({
      key: "cust",
      label: `${l("العميل", "Customer")}: ${filters.customerSearch.trim()}`,
      clear: () => onChange({ customerSearch: "" }),
    });
  }
  if (filters.includeArchivedInvoices) {
    activeTags.push({
      key: "archInv",
      label: l("شامل المؤرشفة", "Includes archived"),
      clear: () => onChange({ includeArchivedInvoices: false }),
    });
  }
  if (filters.purchaseCategory) {
    activeTags.push({
      key: "purCat",
      label: `${l("التصنيف", "Category")}: ${filters.purchaseCategory}`,
      clear: () => onChange({ purchaseCategory: "" }),
    });
  }
  if (filters.purchaseDocumentType !== "ALL") {
    activeTags.push({
      key: "purDoc",
      label: `${l("مستند الشراء", "Bill Type")}: ${filters.purchaseDocumentType}`,
      clear: () => onChange({ purchaseDocumentType: "ALL" }),
    });
  }
  if (filters.purchasePostingStatus !== "ALL") {
    activeTags.push({
      key: "purPost",
      label: `${l("الترحيل", "Posting")}: ${filters.purchasePostingStatus}`,
      clear: () => onChange({ purchasePostingStatus: "ALL" }),
    });
  }
  if (filters.purchasePaymentStatus !== "ALL") {
    activeTags.push({
      key: "purPay",
      label: `${l("سداد المورد", "Bill Payment")}: ${filters.purchasePaymentStatus}`,
      clear: () => onChange({ purchasePaymentStatus: "ALL" }),
    });
  }
  if (filters.supplierSearch.trim()) {
    activeTags.push({
      key: "sup",
      label: `${l("المورد", "Supplier")}: ${filters.supplierSearch.trim()}`,
      clear: () => onChange({ supplierSearch: "" }),
    });
  }
  if (filters.includeVoidedPurchases) {
    activeTags.push({
      key: "voidPur",
      label: l("شامل الملغاة", "Includes voided"),
      clear: () => onChange({ includeVoidedPurchases: false }),
    });
  }
  if (filters.paymentDirection !== "ALL") {
    activeTags.push({
      key: "payDir",
      label: `${l("اتجاه السند", "Direction")}: ${filters.paymentDirection}`,
      clear: () => onChange({ paymentDirection: "ALL" }),
    });
  }
  if (filters.paymentDocumentType !== "ALL") {
    activeTags.push({
      key: "payDoc",
      label: `${l("مستند السند", "Payment Doc")}: ${filters.paymentDocumentType}`,
      clear: () => onChange({ paymentDocumentType: "ALL" }),
    });
  }
  if (filters.cashAccount) {
    activeTags.push({
      key: "cashAcc",
      label: `${l("الحساب النقدي", "Cash/Bank")}: ${filters.cashAccount}`,
      clear: () => onChange({ cashAccount: "" }),
    });
  }
  if (filters.journalSourceType) {
    activeTags.push({
      key: "jSrc",
      label: `${l("مصدر القيد", "Journal Source")}: ${journalSourceTypeLabel(filters.journalSourceType, isEn)}`,
      clear: () => onChange({ journalSourceType: "" }),
    });
  }
  if (filters.accountCode) {
    activeTags.push({
      key: "accCode",
      label: `${l("الحساب", "Account")}: ${filters.accountCode}`,
      clear: () => onChange({ accountCode: "" }),
    });
  }
  if (filters.vehiclePlate.trim()) {
    activeTags.push({
      key: "plate",
      label: `${l("المركبة", "Plate")}: ${filters.vehiclePlate.trim()}`,
      clear: () => onChange({ vehiclePlate: "" }),
    });
  }
  if (filters.minAmount.trim() || filters.maxAmount.trim()) {
    activeTags.push({
      key: "amt",
      label: `${l("المبلغ", "Amount")}: ${filters.minAmount.trim() || "0"} - ${filters.maxAmount.trim() || "∞"}`,
      clear: () => onChange({ minAmount: "", maxAmount: "" }),
    });
  }
  if (!filters.nonZeroTrialOnly) {
    activeTags.push({
      key: "zeroTrial",
      label: l("عرض الحسابات الصفرية بالميزان", "Show zero-balance accounts"),
      clear: () => onChange({ nonZeroTrialOnly: true }),
    });
  }

  return (
    <div className="space-y-3">
      {activeTags.length > 0 && (
        <div
          aria-label={l("الفلاتر المتقدمة النشطة", "Active advanced filters")}
          className="flex flex-wrap items-center gap-1.5 pt-1"
        >
          {activeTags.map((tag) => (
            <button
              key={tag.key}
              type="button"
              onClick={tag.clear}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-gold)] hover:border-[var(--accent-gold)] cursor-pointer"
            >
              <span>{tag.label}</span>
              <X className="size-3" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 hover:border-rose-500 cursor-pointer"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span>{l("إعادة ضبط الكل", "Reset all")}</span>
          </button>
        </div>
      )}

      {open && (
        <div
          id={`${uid}-panel`}
          className="border-t theme-border pt-4 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]">
              <SlidersHorizontal
                className="size-4 text-[var(--accent-gold)]"
                aria-hidden="true"
              />
              <span>
                {l(
                  "الفلاتر المتقدمة المشتركة والمخصصة لكل قسم",
                  "Section-Specific & Cross-Ledger Advanced Filters",
                )}
              </span>
              {activeCount > 0 && (
                <span className="rounded-full bg-[var(--accent-surface)] px-2 py-0.5 text-[11px] font-mono text-[var(--accent-gold)]">
                  {activeCount}
                </span>
              )}
            </div>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex min-h-11 sm:min-h-8 items-center gap-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 hover:border-rose-500 cursor-pointer"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                <span>{l("مسح الفلاتر", "Reset filters")}</span>
              </button>
            )}
          </div>

          {amountRangeError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-800 dark:text-rose-200"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <span>{amountRangeError}</span>
            </div>
          )}

          {/* Group 1: Invoices */}
          <fieldset className="rounded-2xl border theme-border bg-[var(--bg-card-subtle)]/50 p-4 space-y-3">
            <legend className="px-2 text-xs font-bold text-[var(--accent-gold)]">
              {l("١. فلاتر فواتير المبيعات والإشعارات", "1. Sales Invoices & Notes")}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("نوع الفاتورة", "Document type")}</span>
                <select
                  className={CONTROL}
                  value={filters.invoiceType}
                  onChange={(e) =>
                    onChange({
                      invoiceType: e.target.value as FinancialExportFilters["invoiceType"],
                    })
                  }
                >
                  <option value="ALL">{l("الكل", "All")}</option>
                  <option value="TAX">{l("ضريبية (TAX)", "Tax Invoices")}</option>
                  <option value="BOOKING">{l("رحلات وحجوزات (INV)", "Booking Invoices")}</option>
                  <option value="PROFORMA">{l("مبدئية (SO)", "Proforma")}</option>
                  <option value="NOTES">{l("إشعارات دائن/مدين (CN/DN)", "Credit / Debit Notes")}</option>
                </select>
              </label>

              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("حالة التحصيل", "Payment status")}</span>
                <select
                  className={CONTROL}
                  value={filters.invoicePaymentStatus}
                  onChange={(e) =>
                    onChange({
                      invoicePaymentStatus: e.target
                        .value as FinancialExportFilters["invoicePaymentStatus"],
                    })
                  }
                >
                  <option value="ALL">{l("كل الحالات", "All statuses")}</option>
                  <option value="PAID">{l("مدفوعة بالكامل", "Paid")}</option>
                  <option value="PARTIAL">{l("مدفوعة جزئياً", "Partially paid")}</option>
                  <option value="UNPAID">{l("غير مدفوعة", "Unpaid")}</option>
                  <option value="REFUND_DUE">{l("رصيد للعميل", "Refund due")}</option>
                  <option value="UNPOSTED">{l("بانتظار المراجعة", "Unposted / Review")}</option>
                </select>
              </label>

              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("تصفية باسم العميل", "Customer name")}</span>
                <input
                  type="text"
                  maxLength={150}
                  placeholder={l("اسم العميل أو المنشأة...", "Customer name...")}
                  className={CONTROL}
                  value={filters.customerSearch}
                  onChange={(e) => onChange({ customerSearch: e.target.value })}
                />
              </label>

              <label className="flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] cursor-pointer">
                <Checkbox
                  checked={filters.includeArchivedInvoices}
                  onChange={(e) =>
                    onChange({ includeArchivedInvoices: e.target.checked })
                  }
                />
                <span>{l("تضمين الفواتير المزالة", "Include archived invoices")}</span>
              </label>
            </div>
          </fieldset>

          {/* Group 2: Purchases */}
          <fieldset className="rounded-2xl border theme-border bg-[var(--bg-card-subtle)]/50 p-4 space-y-3">
            <legend className="px-2 text-xs font-bold text-[var(--accent-gold)]">
              {l("٢. فلاتر المشتريات ومصروفات الأسطول", "2. Purchases & Fleet Expenses")}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 items-end">
              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("التصنيف", "Expense category")}</span>
                <select
                  className={CONTROL}
                  value={filters.purchaseCategory}
                  onChange={(e) =>
                    onChange({
                      purchaseCategory: e.target
                        .value as FinancialExportFilters["purchaseCategory"],
                    })
                  }
                >
                  <option value="">{l("كل التصنيفات", "All categories")}</option>
                  {Object.entries(EXPENSE_CATEGORIES).map(([k, arLabel]) => (
                    <option key={k} value={k}>
                      {isEn ? k.replaceAll("_", " ") : arLabel}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("نوع مستند المورد", "Purchase doc type")}</span>
                <select
                  className={CONTROL}
                  value={filters.purchaseDocumentType}
                  onChange={(e) =>
                    onChange({
                      purchaseDocumentType: e.target
                        .value as FinancialExportFilters["purchaseDocumentType"],
                    })
                  }
                >
                  <option value="ALL">{l("الكل", "All")}</option>
                  <option value="PURCHASE_INVOICE">{l("فاتورة مشتريات", "Supplier Invoice")}</option>
                  <option value="PURCHASE_RETURN">{l("مرتجع مشتريات", "Purchase Return")}</option>
                </select>
              </label>

              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("حالة الترحيل", "Posting status")}</span>
                <select
                  className={CONTROL}
                  value={filters.purchasePostingStatus}
                  onChange={(e) =>
                    onChange({
                      purchasePostingStatus: e.target
                        .value as FinancialExportFilters["purchasePostingStatus"],
                    })
                  }
                >
                  <option value="ALL">{l("الكل", "All")}</option>
                  <option value="POSTED">{l("معتمد / مرحّل", "Posted")}</option>
                  <option value="DRAFT">{l("مسودة", "Draft")}</option>
                  <option value="LEGACY">{l("سجل سابق", "Legacy")}</option>
                </select>
              </label>

              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("حالة سداد المورد", "Supplier payment status")}</span>
                <select
                  className={CONTROL}
                  value={filters.purchasePaymentStatus}
                  onChange={(e) =>
                    onChange({
                      purchasePaymentStatus: e.target
                        .value as FinancialExportFilters["purchasePaymentStatus"],
                    })
                  }
                >
                  <option value="ALL">{l("كل الحالات", "All statuses")}</option>
                  <option value="PAID">{l("مسددة", "Paid")}</option>
                  <option value="PARTIAL">{l("مسددة جزئياً", "Partially paid")}</option>
                  <option value="UNPAID">{l("آجل / غير مسددة", "Unpaid")}</option>
                  <option value="REFUND_DUE">{l("رصيد لدى المورد", "Supplier credit")}</option>
                </select>
              </label>

              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("تصفية باسم المورد", "Supplier name")}</span>
                <input
                  type="text"
                  maxLength={150}
                  placeholder={l("اسم المورد أو الرقم الضريبي...", "Supplier name or VAT #...")}
                  className={CONTROL}
                  value={filters.supplierSearch}
                  onChange={(e) => onChange({ supplierSearch: e.target.value })}
                />
              </label>

              <label className="flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] cursor-pointer">
                <Checkbox
                  checked={filters.includeVoidedPurchases}
                  onChange={(e) =>
                    onChange({ includeVoidedPurchases: e.target.checked })
                  }
                />
                <span>{l("تضمين المصروفات الملغاة", "Include voided expenses")}</span>
              </label>
            </div>
          </fieldset>

          {/* Group 3: Payments, Ledger, Vehicles & Amount Range */}
          <fieldset className="rounded-2xl border theme-border bg-[var(--bg-card-subtle)]/50 p-4 space-y-3">
            <legend className="px-2 text-xs font-bold text-[var(--accent-gold)]">
              {l(
                "٣. فلاتر السندات، دفتر الأستاذ، المركبات والمبالغ",
                "3. Payments, Ledger, Vehicles & Amount Range",
              )}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("اتجاه السند", "Payment direction")}</span>
                <select
                  className={CONTROL}
                  value={filters.paymentDirection}
                  onChange={(e) =>
                    onChange({
                      paymentDirection: e.target
                        .value as FinancialExportFilters["paymentDirection"],
                    })
                  }
                >
                  <option value="ALL">{l("الكل", "All")}</option>
                  <option value="RECEIPT">{l("سند قبض", "Receipt")}</option>
                  <option value="PAYMENT">{l("سند صرف", "Disbursement")}</option>
                </select>
              </label>

              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("مستند السند", "Payment document")}</span>
                <select
                  className={CONTROL}
                  value={filters.paymentDocumentType}
                  onChange={(e) =>
                    onChange({
                      paymentDocumentType: e.target
                        .value as FinancialExportFilters["paymentDocumentType"],
                    })
                  }
                >
                  <option value="ALL">{l("الكل", "All")}</option>
                  <option value="SALE">{l("مبيعات", "Sales")}</option>
                  <option value="PURCHASE">{l("مشتريات", "Purchases")}</option>
                </select>
              </label>

              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("الحساب النقدي / البنك", "Cash/Bank account")}</span>
                <select
                  className={CONTROL}
                  value={filters.cashAccount}
                  onChange={(e) => onChange({ cashAccount: e.target.value })}
                >
                  <option value="">{l("كل الحسابات النقدية", "All cash/bank accounts")}</option>
                  {cashAccounts.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} · {isEn && a.nameEn ? a.nameEn : a.nameAr}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("مصدر القيد", "Journal source")}</span>
                <select
                  className={CONTROL}
                  value={filters.journalSourceType}
                  onChange={(e) => onChange({ journalSourceType: e.target.value })}
                >
                  <option value="">{l("كل المصادر", "All sources")}</option>
                  {JOURNAL_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {journalSourceTypeLabel(s, isEn)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("حساب محدد", "Specific GL account")}</span>
                <select
                  className={CONTROL}
                  value={filters.accountCode}
                  onChange={(e) => onChange({ accountCode: e.target.value })}
                >
                  <option value="">{l("كل الحسابات", "All accounts")}</option>
                  {allAccounts.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} · {isEn && a.nameEn ? a.nameEn : a.nameAr}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <label htmlFor={`${uid}-vehicle-select`}>
                  <span>{l("المركبة / اللوحة", "Vehicle plate")}</span>
                </label>
                {vehicles.length > 0 ? (
                  <select
                    id={`${uid}-vehicle-select`}
                    className={CONTROL}
                    value={filters.vehiclePlate}
                    onChange={(e) => onChange({ vehiclePlate: e.target.value })}
                  >
                    <option value="">{l("كل المركبات", "All vehicles")}</option>
                    {vehicles.map((v) => {
                      const plateVal = v.plateNumberAr || v.plateNumberEn || v.id;
                      return (
                        <option key={v.id} value={plateVal}>
                          {v.plateNumberAr}
                          {v.plateNumberEn ? ` (${v.plateNumberEn})` : ""}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    id={`${uid}-vehicle-select`}
                    type="text"
                    maxLength={50}
                    placeholder={l("رقم اللوحة...", "Vehicle plate...")}
                    className={`${CONTROL} font-mono`}
                    value={filters.vehiclePlate}
                    onChange={(e) => onChange({ vehiclePlate: e.target.value })}
                  />
                )}
              </div>

              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("الحد الأدنى للمبلغ (ر.س)", "Min amount (SAR)")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="0.00"
                  className={`${CONTROL} font-mono`}
                  value={filters.minAmount}
                  onChange={(e) => onChange({ minAmount: e.target.value })}
                />
              </label>

              <label className="space-y-1 text-xs font-bold text-[var(--text-main)]">
                <span>{l("الحد الأقصى للمبلغ (ر.س)", "Max amount (SAR)")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="99999.00"
                  className={`${CONTROL} font-mono`}
                  value={filters.maxAmount}
                  onChange={(e) => onChange({ maxAmount: e.target.value })}
                />
              </label>
            </div>

            <label className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] cursor-pointer">
              <Checkbox
                checked={filters.nonZeroTrialOnly}
                onChange={(e) =>
                  onChange({ nonZeroTrialOnly: e.target.checked })
                }
              />
              <span>
                {l(
                  "إخفاء الحسابات ذات الرصيد والحركة الصفرية في ميزان المراجعة",
                  "Hide zero-activity accounts in Trial Balance",
                )}
              </span>
            </label>
          </fieldset>
        </div>
      )}
    </div>
  );
}
