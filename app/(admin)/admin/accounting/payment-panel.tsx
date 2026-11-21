"use client";
import { useUiText } from "@/lib/ui-text";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Calendar,
  Loader2,
  AlertCircle,
  Search,
  SlidersHorizontal,
  Wallet,
  X,
} from "lucide-react";
import {
  accountingRequest,
  amountLabel,
  buildAccountingQuery,
  currentSaudiPeriod,
  filterCashBankAccounts,
  type Account,
  type PaymentListResponse,
} from "@/lib/accounting";
import { moneyDecimal, moneyMinor } from "@/lib/money";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import { useApiQuery } from "@/lib/use-api-query";
import { useAuth } from "@/lib/authContext";
import { hasClientPermission } from "@/lib/permissions";
import { useUrlState } from "@/lib/use-url-state";
import { Badge } from "@/app/_components/ui";
import { MobileCardField, MobileCardMetaGrid, MobileRecordCard } from "@/app/_components/mobile";
import { AccountingDocumentCombobox } from "./document-combobox";

const INPUT = "theme-input mt-1.5 min-h-11 sm:min-h-9 w-full rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem]";

const PAYMENT_DIRECTIONS = ["", "RECEIPT", "PAYMENT"] as const;
const PAYMENT_DOC_TYPES = ["", "SALE", "PURCHASE"] as const;

export default function PaymentPanel({
  reload,
  onChanged,
}: {
  reload: number;
  onChanged: () => void;
}) {
  const ui = useUiText();
  const isEn = ui.language === "en";
  const { user } = useAuth();
  const canWrite = hasClientPermission(user, "accounting", "write");

  const [type, setType] = useState<"SALE" | "PURCHASE">("SALE");
  const [documentId, setDocumentId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(currentSaudiPeriod().day);
  const [cashAccount, setCashAccount] = useState("1102"); // Default SNB Bank (1102)
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const key = useRef("");
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [listPage, setListPage] = useUrlState<number>("payPage", 1);
  const [payDir, setPayDir] = useUrlState<string>("payDir", "", PAYMENT_DIRECTIONS);
  const [payDocType, setPayDocType] = useUrlState<string>("payDocType", "", PAYMENT_DOC_TYPES);
  const [payCash, setPayCash] = useUrlState<string>("payCash", "");
  const [payFrom, setPayFrom] = useUrlState<string>("payFrom", "");
  const [payTo, setPayTo] = useUrlState<string>("payTo", "");
  const [paySearch, setPaySearch] = useUrlState<string>("paySearch", "");
  const [showMoreListFilters, setShowMoreListFilters] = useState(false);

  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

  const accountsQuery = useAccountingQuery<{ items: Account[] }>("/accounts", reload);
  const cashAccountOptions = filterCashBankAccounts(accountsQuery.data?.items);
  const resolvedCashAccounts =
    cashAccountOptions.length > 0
      ? cashAccountOptions
      : [
          { code: "1102", nameAr: "تحويل بنكي - البنك الأهلي SNB", nameEn: "Bank transfer - SNB" },
          { code: "1101", nameAr: "نقداً من الصندوق الرئيسي", nameEn: "Main cash register" },
        ];

  const payments = useAccountingQuery<PaymentListResponse>(
    `/payments${buildAccountingQuery({
      page: listPage,
      pageSize: 30,
      direction: payDir,
      documentType: payDocType,
      cashAccount: payCash,
      startDate: payFrom,
      endDate: payTo,
      search: paySearch,
    })}`,
    reload
  );
  const listPageSize = payments.data?.pageSize || 30;
  const listTotal = payments.data?.total ?? payments.data?.items.length ?? 0;
  const advancedListFiltersCount = [payDir, payDocType, payCash, payFrom, payTo].filter(Boolean).length;
  const listFiltersExpanded = showMoreListFilters || advancedListFiltersCount > 0;
  const hasListFilters = Boolean(
    payDir || payDocType || payCash || payFrom || payTo || paySearch.trim()
  );

  function clearListFilters() {
    setPayDir("");
    setPayDocType("");
    setPayCash("");
    setPayFrom("");
    setPayTo("");
    setPaySearch("");
    setListPage(1);
  }

  const balance = useApiQuery<{ balance: string; direction: string }>(
    documentId ? `/accounting/document-balance/${type}/${documentId}` : null,
    reload
  );

  const remainingBalanceRaw = balance.data ? balance.data.balance.trim().replace(/^-/, "") : "";
  const remainingBalanceMinor = moneyMinor(remainingBalanceRaw) ?? BigInt(0);
  const remainingBalanceText = remainingBalanceMinor > BigInt(0) ? moneyDecimal(remainingBalanceMinor) : "";

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    if (!balance.data) {
      setError(
        balance.error ||
          (isEn
            ? "Wait for the document balance to finish loading before posting."
            : "انتظر اكتمال تحميل رصيد المستند قبل حفظ السند.")
      );
      return;
    }
    const paidMinor = moneyMinor(amount);
    if (paidMinor === null || paidMinor <= BigInt(0)) {
      setError(
        ui.language === "en"
          ? "Enter a valid payment amount greater than 0.00."
          : "يرجى إدخال مبلغ سداد صحيح أكبر من 0.00."
      );
      return;
    }
    if (remainingBalanceMinor > BigInt(0) && paidMinor > remainingBalanceMinor) {
      setError(
        ui.language === "en"
          ? `Amount exceeds remaining balance (${remainingBalanceText} SAR).`
          : `المبلغ المدخل يتجاوز الرصيد المتبقي (${remainingBalanceText} ر.س).`
      );
      return;
    }
    setSaving(true);
    setError("");
    setSuccessMessage("");
    key.current ||= crypto.randomUUID();
    const result = await accountingRequest("/payments", "POST", {
      operationKey: key.current,
      documentType: type,
      documentId,
      amount: moneyDecimal(paidMinor),
      paymentDate: date,
      cashAccount,
      reference: reference.trim() || (type === "SALE" ? "تحصيل دفعة عميل" : "سداد دفعة مورد"),
    });
    setSaving(false);
    if (result.success) {
      key.current = "";
      setAmount("");
      setReference("");
      setSuccessMessage("تم حفظ السند المحاسبي وتحديث الرصيد بنجاح!");
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMessage(""), 3000);
      onChanged();
    } else {
      setError(result.error || "تعذر حفظ السند؛ حاول مرة أخرى.");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[var(--text-main)]">
            {ui("القبض والدفع (سندات التحصيل والصرف)")}</h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
            {ui("تسوية الذمم، تحصيل مستحقات العملاء، وسداد فواتير الموردين عبر البنك أو الصندوق.")}</p>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="p-4 rounded-2xl border border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0" />
          <span>{ui(successMessage)}</span>
        </div>
      )}

      {/* Payment Entry Form */}
      {canWrite ? (
        <form
          onSubmit={save}
          onChange={() => {
            key.current = "";
          }}
          className="theme-card rounded-2xl sm:rounded-3xl border theme-border p-5 sm:p-6 shadow-xs space-y-5"
        >
          {/* Direction Switcher (Receipt vs Disbursement) */}
          <div>
            <label className="text-xs sm:text-[0.8125rem] font-bold text-[var(--text-main)] block mb-2">
              {ui("نوع العملية *")}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => {
                  setType("SALE");
                  setDocumentId("");
                  setAmount("");
                  setError("");
                }}
                className={`min-h-11 sm:min-h-9 p-2.5 sm:p-3 rounded-xl border text-start transition cursor-pointer flex items-center gap-2.5 ${
                  type === "SALE"
                    ? "bg-emerald-500/12 border-emerald-600 ring-1 ring-emerald-600/30 dark:bg-emerald-950/45 dark:border-emerald-500 dark:ring-emerald-500/30"
                    : "theme-card border-[var(--control-border)] hover:border-[var(--accent-gold)]"
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" aria-hidden="true" />
                <div>
                  <strong className="text-xs font-semibold block text-[var(--text-main)]">
                    {ui("تحصيل من عميل (سند قبض)")}</strong>
                  <span className="text-xs text-[var(--text-muted)]">{ui("إيداع بالبنك وتخفيض ذمة العميل")}</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType("PURCHASE");
                  setDocumentId("");
                  setAmount("");
                  setError("");
                }}
                className={`min-h-11 sm:min-h-9 p-2.5 sm:p-3 rounded-xl border text-start transition cursor-pointer flex items-center gap-2.5 ${
                  type === "PURCHASE"
                    ? "bg-[var(--accent-surface)] border-amber-600 ring-1 ring-amber-600/30"
                    : "theme-card border-[var(--control-border)] hover:border-[var(--accent-gold)]"
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                <div>
                  <strong className="text-xs font-semibold block text-[var(--text-main)]">
                    {ui("سداد لمورد (سند صرف)")}</strong>
                  <span className="text-xs text-[var(--text-muted)]">{ui("صرف من البنك وسداد مستحقات")}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Form Inputs Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
              <label
                htmlFor="payment-panel-doc-combobox"
                className="text-xs font-bold text-[var(--text-main)] block"
              >
                {ui("اختر المستند المطلوب تسويته *")}
              </label>
              <AccountingDocumentCombobox
                inputId="payment-panel-doc-combobox"
                documentType={type}
                value={documentId}
                language={ui.language}
                onChange={(opt) => {
                  setDocumentId(opt?.id ?? "");
                  setAmount("");
                  setError("");
                }}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 space-y-2">
              <span className="text-xs font-bold text-[var(--text-main)] block">
                {ui("طريقة الدفع / الحساب المالي *")}
              </span>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {resolvedCashAccounts.map((a) => {
                  const selected = cashAccount === a.code;
                  const isCashBox = a.code.startsWith("1101");
                  const Icon = isCashBox ? Wallet : Building2;
                  const label = isEn && a.nameEn ? a.nameEn : a.nameAr;
                  return (
                    <button
                      key={a.code}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setCashAccount(a.code)}
                      className={`min-h-11 rounded-xl border px-3 py-2.5 text-start transition cursor-pointer flex items-center gap-2.5 ${
                        selected
                          ? "bg-[var(--accent-surface)] border-[var(--accent-gold)] ring-1 ring-[var(--accent-gold)]/35 text-[var(--text-main)]"
                          : "theme-card border-[var(--control-border)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          selected ? "text-[var(--accent-gold)]" : "text-[var(--text-muted)]"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold leading-snug truncate">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-main)] block">
              {ui("المبلغ المسدد (ر.س) *")}
              <div className="relative">
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="0.00"
                  className={`${INPUT} font-mono font-bold pl-3 pr-12`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                  {ui("ر.س")}
                </span>
              </div>
            </label>
            {remainingBalanceMinor > BigInt(0) && (
              <button
                type="button"
                onClick={() => setAmount(remainingBalanceText)}
                className="inline-flex min-h-11 sm:min-h-8 items-center text-xs font-bold text-[var(--accent-gold)] hover:underline cursor-pointer"
              >
                {ui("نسخ كامل المتبقي (")}
                <bdi dir="ltr">{amountLabel(remainingBalanceText)}</bdi> {ui("ر.س)")}
              </button>
            )}
          </div>

          <label className="text-xs font-bold text-[var(--text-main)]">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
              <span>{ui("تاريخ السند *")}</span>
            </span>
            <input
              required
              type="date"
              dir="ltr"
              className={`${INPUT} font-mono text-start`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="text-xs font-bold text-[var(--text-main)]">
            {isEn
              ? cashAccount === "1101"
                ? "Reference / Note (optional for cash)"
                : "Transfer reference *"
              : cashAccount === "1101"
                ? "المرجع أو البيان (اختياري للنقد)"
                : "رقم الحوالة أو المرجع *"}
            <input
              required={cashAccount !== "1101"}
              maxLength={300}
              placeholder={
                cashAccount === "1101"
                  ? isEn
                    ? "e.g. Petty cash receipt"
                    : "مثال: سند نقدي مباشر (اختياري)"
                  : ui("مثال: حوالة بنكية رقم 9842")
              }
              className={INPUT}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
        </div>

        {/* Balance Status Banner */}
        {documentId && (
          <div className="p-3.5 rounded-2xl bg-[var(--bg-card-subtle)] border theme-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[var(--text-muted)]">{ui("حالة المستند المالي المحدد:")}</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[var(--text-main)]">
                {ui("الرصيد المتبقي:")}</span>
              <strong className="font-mono font-semibold text-[var(--accent-gold)] text-sm">
                <bdi dir="ltr">{amountLabel(remainingBalanceText || "0.00")}</bdi> {ui("ر.س")}
              </strong>
              <span className="px-2 py-0.5 rounded-md bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-amber-600/30 font-bold text-xs">
                {ui(type === "SALE" ? "سند قبض" : "سند صرف")}
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving || !documentId || !balance.data || remainingBalanceMinor === BigInt(0)}
            className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg px-5 py-1.5 text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transition disabled:opacity-40 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>{ui("جارٍ حفظ السند…")}</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" aria-hidden="true" />
                <span>{ui("اعتماد وحفظ السند")}</span>
              </>
            )}
          </button>
        </div>

        {(error || balance.error || payments.error) && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{ui(error || balance.error || payments.error)}</span>
          </div>
        )}
      </form>
      ) : (
        <div className="theme-card rounded-2xl border theme-border p-4 text-xs font-semibold text-[var(--text-muted)]">
          {isEn
            ? "Read-only access: creating receipt or payment vouchers requires accounting write permission."
            : "صلاحية عرض فقط: يتطلب إنشاء سندات القبض والصرف صلاحية التعديل المحاسبي."}
        </div>
      )}

      {/* Payment List Filters */}
      <div className="theme-card rounded-2xl border theme-border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search
              className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label={isEn ? "Search reference or voucher" : "بحث في السندات"}
              className={`${INPUT} ps-9 mt-0!`}
              placeholder={isEn ? "Search reference or voucher..." : "بحث بالمرجع أو البيان…"}
              value={paySearch}
              onChange={(e) => {
                setPaySearch(e.target.value);
                setListPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-expanded={listFiltersExpanded}
              onClick={() => setShowMoreListFilters((v) => !v)}
              className={`min-h-11 sm:min-h-9 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                listFiltersExpanded || advancedListFiltersCount > 0
                  ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                  : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isEn ? "More filters" : "فلاتر متقدمة"}</span>
              {advancedListFiltersCount > 0 && (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--accent-btn-bg)] text-[11px] font-bold text-[var(--accent-btn-fg)]">
                  {advancedListFiltersCount}
                </span>
              )}
            </button>

            {hasListFilters && (
              <button
                type="button"
                onClick={clearListFilters}
                aria-label={isEn ? "Clear payment filters" : "مسح فلاتر السندات"}
                className="min-h-11 sm:min-h-9 px-3 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-xs font-bold text-rose-700 dark:text-rose-300 hover:border-rose-500 cursor-pointer inline-flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isEn ? "Reset" : "مسح"}</span>
              </button>
            )}
          </div>
        </div>

        {listFiltersExpanded && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 items-end border-t theme-border pt-3">
            <label className="lg:col-span-2 text-xs font-bold text-[var(--text-main)] space-y-1">
              <span>{isEn ? "Direction" : "الاتجاه"}</span>
              <select
                className={`${INPUT} mt-0!`}
                value={payDir}
                onChange={(e) => {
                  setPayDir(e.target.value);
                  setListPage(1);
                }}
              >
                <option value="">{isEn ? "All" : "الكل"}</option>
                <option value="RECEIPT">{isEn ? "Receipt" : "سند قبض"}</option>
                <option value="PAYMENT">{isEn ? "Disbursement" : "سند صرف"}</option>
              </select>
            </label>

            <label className="lg:col-span-2 text-xs font-bold text-[var(--text-main)] space-y-1">
              <span>{isEn ? "Document type" : "نوع المستند"}</span>
              <select
                className={`${INPUT} mt-0!`}
                value={payDocType}
                onChange={(e) => {
                  setPayDocType(e.target.value);
                  setListPage(1);
                }}
              >
                <option value="">{isEn ? "All" : "الكل"}</option>
                <option value="SALE">{isEn ? "Sales" : "مبيعات"}</option>
                <option value="PURCHASE">{isEn ? "Purchases" : "مشتريات"}</option>
              </select>
            </label>

            <label className="lg:col-span-3 text-xs font-bold text-[var(--text-main)] space-y-1">
              <span>{isEn ? "Cash/Bank account" : "الحساب المالي"}</span>
              <select
                className={`${INPUT} mt-0!`}
                value={payCash}
                onChange={(e) => {
                  setPayCash(e.target.value);
                  setListPage(1);
                }}
              >
                <option value="">{isEn ? "All accounts" : "كل الحسابات"}</option>
                {resolvedCashAccounts.map((a) => (
                  <option key={a.code} value={a.code}>
                    {isEn && a.nameEn ? a.nameEn : a.nameAr}
                  </option>
                ))}
              </select>
            </label>

            <label className="lg:col-span-2 text-xs font-bold text-[var(--text-main)] space-y-1">
              <span>{isEn ? "From" : "من"}</span>
              <input
                type="date"
                dir="ltr"
                className={`${INPUT} mt-0! font-mono`}
                value={payFrom}
                onChange={(e) => {
                  setPayFrom(e.target.value);
                  setListPage(1);
                }}
              />
            </label>

            <label className="lg:col-span-3 text-xs font-bold text-[var(--text-main)] space-y-1">
              <span>{isEn ? "To" : "إلى"}</span>
              <input
                type="date"
                dir="ltr"
                className={`${INPUT} mt-0! font-mono`}
                value={payTo}
                onChange={(e) => {
                  setPayTo(e.target.value);
                  setListPage(1);
                }}
              />
            </label>
          </div>
        )}
      </div>

      {/* Recent Payments Table */}
      <div className="theme-card overflow-hidden rounded-2xl sm:rounded-3xl border theme-border shadow-xs space-y-0">
        <div className="px-5 py-4 border-b theme-border bg-[var(--table-header-bg)] flex items-center justify-between text-xs">
          <h3 className="font-semibold text-[var(--text-main)] text-sm">
            {ui("سجل سندات القبض والصرف الأخيرة (")}
            {listTotal})
          </h3>
          <span className="text-[var(--text-muted)] font-mono">JE Journals</span>
        </div>

        <div className="md:hidden p-3.5 space-y-3">
          {payments.data?.items.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-muted)] text-xs">
              {ui("لا توجد سندات قبض أو صرف مسجلة حتى الآن.")}
            </p>
          ) : (
            payments.data?.items.map((p) => {
              const isReceipt = p.direction === "RECEIPT";
              return (
                <MobileRecordCard
                  key={p.id}
                  title={ui(p.reference)}
                  subtitle={
                    <span className="font-mono">
                      <bdi dir="ltr">{p.paymentDate.slice(0, 10)}</bdi> ·{" "}
                      <bdi dir="ltr">JE-{String(p.journal.number).padStart(6, "0")}</bdi>
                    </span>
                  }
                  badge={
                    <Badge
                      variant={isReceipt ? "success" : "warning"}
                      className="text-[11px] gap-1"
                    >
                      {isReceipt ? (
                        <>
                          <ArrowDownLeft className="w-3 h-3" aria-hidden="true" />
                          <span>{ui("سند قبض")}</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                          <span>{ui("سند صرف")}</span>
                        </>
                      )}
                    </Badge>
                  }
                >
                  <MobileCardMetaGrid>
                    <MobileCardField
                      label={ui("المبلغ")}
                      mono
                      value={
                        <bdi dir="ltr">
                          {amountLabel(p.amount)} {ui("ر.س")}
                        </bdi>
                      }
                    />
                    <MobileCardField
                      label={ui("رقم القيد المحاسبي")}
                      mono
                      value={
                        <bdi dir="ltr" className="text-[var(--accent-gold)]">
                          JE-{String(p.journal.number).padStart(6, "0")}
                        </bdi>
                      }
                    />
                  </MobileCardMetaGrid>
                </MobileRecordCard>
              );
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[650px] text-start text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)] font-bold whitespace-nowrap">
                <th className="px-4 py-3.5">{ui("التاريخ")}</th>
                <th className="px-4 py-3.5">{ui("النوع")}</th>
                <th className="px-4 py-3.5">{ui("المرجع والبيان")}</th>
                <th className="px-4 py-3.5">{ui("المبلغ")}</th>
                <th className="px-4 py-3.5">{ui("رقم القيد المحاسبي")}</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {payments.data?.items.map((p) => {
                const isReceipt = p.direction === "RECEIPT";
                return (
                  <tr key={p.id} className="hover:bg-[var(--table-row-hover)] transition">
                    <td className="px-4 py-3.5 font-mono text-[var(--text-muted)] whitespace-nowrap">
                      <bdi dir="ltr">{p.paymentDate.slice(0, 10)}</bdi>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          isReceipt
                            ? "bg-emerald-500/12 text-emerald-800 border-emerald-600/35 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35"
                            : "bg-[var(--accent-surface)] text-[var(--accent-gold)] border-amber-600/30"
                        }`}
                      >
                        {isReceipt ? (
                          <>
                            <ArrowDownLeft className="w-3 h-3" aria-hidden="true" />
                            <span>{ui("سند قبض")}</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                            <span>{ui("سند صرف")}</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[var(--text-main)]">
                      {ui(p.reference)}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-[var(--text-main)] whitespace-nowrap" dir="ltr">
                      {amountLabel(p.amount)} <span className="text-xs text-[var(--accent-gold)] font-bold">{ui("ر.س")}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-[var(--accent-gold)] whitespace-nowrap">
                      <bdi dir="ltr">JE-{String(p.journal.number).padStart(6, "0")}</bdi>
                    </td>
                  </tr>
                );
              })}

              {payments.data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--text-muted)] text-xs">
                    {ui("لا توجد سندات قبض أو صرف مسجلة حتى الآن.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {listTotal > listPageSize && (
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium pt-1">
          <button
            type="button"
            className="min-h-11 sm:min-h-9 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-4 py-2 text-[var(--text-main)] disabled:opacity-40 cursor-pointer hover:border-[var(--accent-gold)] transition-colors"
            disabled={listPage <= 1}
            onClick={() => setListPage((v) => Math.max(1, v - 1))}
          >
            {ui("السابق")}
          </button>
          <p className="font-mono text-[var(--text-muted)]">
            <bdi>{listTotal}</bdi> {isEn ? "vouchers · Page" : "سند · صفحة"} <bdi>{listPage}</bdi>
          </p>
          <button
            type="button"
            className="min-h-11 sm:min-h-9 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-4 py-2 text-[var(--text-main)] disabled:opacity-40 cursor-pointer hover:border-[var(--accent-gold)] transition-colors"
            disabled={listPage * listPageSize >= listTotal}
            onClick={() => setListPage((v) => v + 1)}
          >
            {ui("التالي")}
          </button>
        </div>
      )}
    </section>
  );
}
