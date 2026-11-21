"use client";
import { useReportPeriod } from "@/lib/use-report-period";
import { useUrlState } from "@/lib/use-url-state";
import { useUiText } from "@/lib/ui-text";
import { useAuth } from "@/lib/authContext";
import { hasClientPermission } from "@/lib/permissions";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  History,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  ShoppingBag,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";
import {
  amountLabel,
  buildPurchasesQueryPath,
  EXPENSE_CATEGORIES,
  filterCashBankAccounts,
  paymentStatusMeta,
  type Account,
  type PurchaseList,
  type PurchaseRow,
} from "@/lib/accounting";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionMenu, ActionMenuItem } from "@/components/ui/action-menu";
import {
  Badge,
  Button,
  Money,
  PageHeader,
  StatCard,
  StatRow,
} from "@/app/_components/ui";
import { formatMoneyValue } from "@/app/_components/ui/Money";
import {
  MobileCardField,
  MobileCardMetaGrid,
  MobileRecordCard,
} from "@/app/_components/mobile";
import AccountingPeriodSelector from "@/app/_components/AccountingPeriodSelector";
import RecordPaymentModal from "../invoices/record-payment-modal";
import PurchaseForm from "./purchase-form";
import PurchaseHistory from "./purchase-history";
import { useLanguage } from "@/lib/languageContext";

const CONTROL =
  "theme-input min-h-11 sm:min-h-9 rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem]";

function signedPurchaseAmount(raw: string, isReturn: boolean): string {
  const cleaned = raw.trim();
  if (!isReturn) return cleaned;
  return cleaned.startsWith("-") ? cleaned : `-${cleaned}`;
}

export default function PurchasesPage() {
  const ui = useUiText();
  const { user } = useAuth();
  const canWrite = hasClientPermission(user, "purchases", "write");
  const canWriteAccounting = hasClientPermission(user, "accounting", "write");

  const { t, dir, isRTL } = useLanguage();
  const text = (ar: string, en: string) => (isRTL ? ar : en);

  const [period, setPeriod] = useReportPeriod();
  const [category, setCategory] = useUrlState<string>("category", "");
  const [documentType, setDocumentType] = useUrlState<string>("docType", "", [
    "",
    "PURCHASE_INVOICE",
    "PURCHASE_RETURN",
  ]);
  const [postingStatus, setPostingStatus] = useUrlState<string>("status", "", [
    "",
    "POSTED",
    "DRAFT",
  ]);
  const [paymentAccountCode, setPaymentAccountCode] = useUrlState<string>(
    "payAcc",
    "",
  );
  const [search, setSearch] = useUrlState<string>("q", "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useUrlState<number>("page", 1);
  const [includeVoided, setIncludeVoided] = useUrlState<boolean>(
    "voided",
    false,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState<
    PurchaseRow | "NEW" | "NEW_RETURN" | null
  >(null);
  const [history, setHistory] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<PurchaseRow | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const queryPath = useMemo(
    () =>
      buildPurchasesQueryPath({
        period,
        page,
        search: debouncedSearch,
        includeVoided,
        category,
        documentType,
        postingStatus,
        paymentAccountCode,
      }),
    [
      period,
      page,
      debouncedSearch,
      includeVoided,
      category,
      documentType,
      postingStatus,
      paymentAccountCode,
    ],
  );

  const { data, error, isLoading } = useAccountingQuery<PurchaseList>(
    queryPath,
    reload,
  );
  const accountsQuery = useAccountingQuery<{ items: Account[] }>(
    "/accounts",
    reload,
  );
  const paymentAccounts = useMemo(() => {
    const items = accountsQuery.data?.items || [];
    const cashBank = filterCashBankAccounts(items);
    const payable = items.filter(
      (a) => a.isActive && a.isPosting && a.code === "2101",
    );
    return [...payable, ...cashBank];
  }, [accountsQuery.data]);

  const activeFiltersCount =
    (category ? 1 : 0) +
    (documentType ? 1 : 0) +
    (postingStatus ? 1 : 0) +
    (paymentAccountCode ? 1 : 0) +
    (includeVoided ? 1 : 0);
  const filtersOpen = showFilters || activeFiltersCount > 0;
  const hasAnyFilter = activeFiltersCount > 0 || Boolean(search.trim());

  function clearFilters() {
    setCategory("");
    setDocumentType("");
    setPostingStatus("");
    setPaymentAccountCode("");
    setIncludeVoided(false);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  }

  function saved() {
    setEditor(null);
    setMessage(
      isRTL
        ? "تم حفظ فاتورة المورد وتحديث السجل المالي والضريبي."
        : "Supplier invoice saved and ledger updated.",
    );
    setReload((value) => value + 1);
  }

  const purchasesHelpGuide = useMemo(
    () => ({
      title: isRTL
        ? "دليل المصروفات والمشتريات ومعالجة ضريبة المدخلات"
        : "Purchases & Input VAT Guide",
      summary: isRTL
        ? "يُسجل في هذا القسم كافة فواتير الموردين ومصاريف تشغيل الأسطول من وقود وصيانة وتأمين، مع احتساب ضريبة المشتريات القابلة للخصم في الإقرار."
        : "Records all supplier invoices and fleet operating expenses (fuel, maintenance, insurance), tracking deductible input VAT for the tax return.",
      cards: [
        {
          title: isRTL ? "١. فئات مصروفات الأسطول" : "1. Fleet Expense Categories",
          badge: isRTL ? "التكاليف التشغيلية" : "Operating Costs",
          items: [
            {
              label: isRTL ? "مصروفات المركبات والتشغيل" : "Vehicle & Operations",
              description: isRTL
                ? "الوقود (5101)، الصيانة والإطارات (5102)، النقل من الباطن (5103)، وتأمين المركبات (5104)."
                : "Fuel (5101), Maintenance & Tyres (5102), Subcontracted Transport (5103), Vehicle Insurance (5104).",
            },
            {
              label: isRTL ? "الرواتب والرسوم الحكومية" : "Salaries & Government Fees",
              description: isRTL
                ? "رواتب وتريبات السائقين (5105) والرسوم والتراخيص (5106)؛ وتُضبط ضريبتها على 0.00 ر.س تلقائياً لعدم تضخيم الضريبة."
                : "Driver salaries & trips (5105), licensing & government fees (5106); VAT locked at 0.00 SAR.",
            },
          ],
        },
        {
          title: isRTL ? "٢. ضريبة مشتريات يمكن خصمها" : "2. Deductible Input VAT",
          badge: "ZATCA 15%",
          items: [
            {
              label: isRTL ? "شروط استحقاق الخصم" : "Deduction Eligibility",
              description: isRTL
                ? "توفر فاتورة ضريبية رسمية باسم الشركة، ورقم ضريبي للمورد، ورقم مرجعي للمستند."
                : "Official company tax invoice, supplier tax number, and reference voucher number.",
            },
            {
              label: isRTL ? "حساب الضريبة من الإجمالي" : "VAT Extracted from Gross",
              description: isRTL
                ? "يدعم النظام إدخال الصافي قبل الضريبة أو استخراج الضريبة عكسياً من الإجمالي شامل 15% بدقة هللة واحدة."
                : "Supports net entry or reverse extraction from 15% gross with halala precision.",
            },
          ],
        },
        {
          title: isRTL ? "٣. طريقة الدفع والأرشفة" : "3. Payment & Archiving",
          badge: isRTL ? "المرفقات والقيود" : "Ledger & Attachments",
          items: [
            {
              label: isRTL ? "طرق السداد المعتمدة" : "Payment Methods",
              description: isRTL
                ? "آجل على حساب المورد أو تحويل بنكي أو نقداً من الصندوق."
                : "Payable to supplier, bank transfer, or petty cash.",
            },
            {
              label: isRTL ? "رفع صورة الفاتورة أو PDF" : "Receipt / PDF Upload",
              description: isRTL
                ? "يمكن إرفاق نسخة الفاتورة أو الإيصال مباشرة لحفظ المستند المؤيد للخصم الضريبي."
                : "Upload invoice photos or PDF receipts to archive supporting documentation.",
            },
          ],
        },
      ],
      tip: isRTL
        ? "عند تسجيل مصروفات غير خاضعة للضريبة مثل الرسوم الحكومية أو الرواتب، يُغلق حقل الضريبة تلقائياً لمنع أي أخطاء في إقرار هيئة الزكاة."
        : "Non-taxable expenses like government fees or salaries automatically lock VAT to 0.00 to prevent return errors.",
    }),
    [isRTL],
  );

  const periodLabel =
    period.mode === "QUARTER"
      ? isRTL
        ? `الربع ${period.quarter} لسنة ${period.year}`
        : `Q${period.quarter} ${period.year}`
      : period.mode === "YEAR"
        ? String(period.year)
        : `${period.startDate} — ${period.endDate}`;

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      {/* 1. Unified Page Header */}
      <PageHeader
        title={ui(t("purchases.title"))}
        subtitle={ui(t("purchases.subtitle"))}
        badge={t("section.financeDaily")}
        icon={ShoppingBag}
        onRefresh={() => setReload((value) => value + 1)}
        isRefreshing={isLoading}
        helpGuide={purchasesHelpGuide}
        onSeeded={(msg) => {
          setMessage(msg);
          setReload((value) => value + 1);
        }}
        onSeedError={(err) => setMessage(err)}
        actions={
          canWrite ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setEditor("NEW_RETURN");
                }}
                className="theme-card inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 transition shadow-2xs cursor-pointer"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                <span>+ {ui(t("purchases.newReturn"))}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setEditor("NEW");
                }}
                className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>{ui(t("purchases.newPurchase"))}</span>
              </button>
            </>
          ) : undefined
        }
      />

      {/* 2. Calm Filters Toolbar */}
      <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <AccountingPeriodSelector
            value={period}
            onChange={(next) => {
              setPeriod(next);
              setPage(1);
            }}
          />

          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px] justify-end">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search
                className="size-4 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                className={`${CONTROL} w-full ps-9`}
                aria-label={ui("بحث بالمورد أو الفاتورة أو اللوحة")}
                placeholder={ui("بحث بالمورد، رقم الفاتورة أو اللوحة...")}
                maxLength={200}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <button
              type="button"
              aria-expanded={filtersOpen}
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                filtersOpen
                  ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                  : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
              }`}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              <span>{text("تصفية", "Filters")}</span>
              {activeFiltersCount > 0 && (
                <span className="rounded-full bg-[var(--accent-gold)] text-white px-1.5 py-0.5 font-mono text-[10px] leading-none">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {hasAnyFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-11 sm:min-h-9 items-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-muted)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition cursor-pointer"
              >
                <X className="size-3.5" aria-hidden="true" />
                <span>{text("مسح", "Clear")}</span>
              </button>
            )}
          </div>
        </div>

        {filtersOpen && (
          <div className="pt-3 border-t theme-border space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-bold text-[var(--text-main)]">
                {ui("تصنيف المصروف")}
                <select
                  className={`${CONTROL} mt-1 w-full`}
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{ui("جميع المصروفات")}</option>
                  {Object.entries(EXPENSE_CATEGORIES).map(([catKey, label]) => (
                    <option key={catKey} value={catKey}>
                      {ui(label)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-bold text-[var(--text-main)]">
                {isRTL ? "نوع المستند" : "Document Type"}
                <select
                  className={`${CONTROL} mt-1 w-full`}
                  value={documentType}
                  onChange={(e) => {
                    setDocumentType(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{isRTL ? "الكل" : "All"}</option>
                  <option value="PURCHASE_INVOICE">
                    {isRTL ? "فاتورة مشتريات" : "Purchase Invoice"}
                  </option>
                  <option value="PURCHASE_RETURN">
                    {isRTL ? "مرتجع مشتريات" : "Purchase Return"}
                  </option>
                </select>
              </label>

              <label className="text-xs font-bold text-[var(--text-main)]">
                {isRTL ? "حالة الاعتماد" : "Status"}
                <select
                  className={`${CONTROL} mt-1 w-full`}
                  value={postingStatus}
                  onChange={(e) => {
                    setPostingStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{isRTL ? "الكل" : "All"}</option>
                  <option value="POSTED">{isRTL ? "معتمد" : "Approved"}</option>
                  <option value="DRAFT">{isRTL ? "مسودة للمراجعة" : "Draft"}</option>
                </select>
              </label>

              <label className="text-xs font-bold text-[var(--text-main)]">
                {isRTL ? "طريقة الدفع" : "Payment Method"}
                <select
                  className={`${CONTROL} mt-1 w-full`}
                  value={paymentAccountCode}
                  onChange={(e) => {
                    setPaymentAccountCode(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{isRTL ? "الكل" : "All"}</option>
                  {(paymentAccounts.length > 0
                    ? paymentAccounts
                    : [
                        { code: "2101", nameAr: "آجل على المورد", nameEn: "Pay later (Supplier)" },
                        { code: "1102", nameAr: "تحويل بنكي", nameEn: "Bank transfer" },
                        { code: "1101", nameAr: "نقداً", nameEn: "Cash" },
                      ]
                  ).map((acc) => (
                    <option key={acc.code} value={acc.code}>
                      {acc.code === "2101"
                        ? text("آجل على المورد", "Pay later (Supplier)")
                        : ui.language === "en" && acc.nameEn
                          ? acc.nameEn
                          : ui(acc.nameAr)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex min-h-11 items-center gap-2.5 text-xs font-bold text-[var(--text-muted)] cursor-pointer">
                <Checkbox
                  checked={includeVoided}
                  onChange={(e) => {
                    setIncludeVoided(e.target.checked);
                    setPage(1);
                  }}
                />
                <span>{ui("إظهار المصروفات الملغاة")}</span>
              </label>
              <p className="text-xs text-[var(--text-muted)]">
                {ui("تُحتسب الإجماليات للمصروفات المعتمدة خلال الفترة المحددة.")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-600/35 bg-emerald-500/12 dark:border-emerald-500/35 dark:bg-emerald-950/45 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300"
        >
          {ui(message)}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="theme-card rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-400"
        >
          {ui(error)}
        </p>
      )}

      {/* KPI Cards Ribbon */}
      <StatRow columns={4}>
        <StatCard
          label={ui(t("purchases.subtotal"))}
          value={data?.totals.netAmount ? amountLabel(data.totals.netAmount) : "0.00"}
          unit={t("common.sar")}
          icon={ShoppingBag}
          isLoading={isLoading && !data}
        />
        <StatCard
          label={ui(t("purchases.totalVat"))}
          value={data?.totals.vatAmount ? amountLabel(data.totals.vatAmount) : "0.00"}
          unit={t("common.sar")}
          icon={SlidersHorizontal}
          variant="amber"
          isLoading={isLoading && !data}
        />
        <StatCard
          label={ui(t("purchases.recoverableVat"))}
          value={
            data?.totals.recoverableVat
              ? amountLabel(data.totals.recoverableVat)
              : "0.00"
          }
          unit={t("common.sar")}
          icon={RotateCcw}
          variant="emerald"
          isLoading={isLoading && !data}
        />
        <StatCard
          label={ui(t("purchases.total"))}
          value={
            data?.totals.totalAmount ? amountLabel(data.totals.totalAmount) : "0.00"
          }
          unit={t("common.sar")}
          icon={ShoppingBag}
          variant="blue"
          isLoading={isLoading && !data}
        />
      </StatRow>

      {/* Purchases Table Container */}
      <div className="theme-card overflow-hidden rounded-2xl sm:rounded-3xl border theme-border shadow-xs">
        <div className="px-4 sm:px-5 py-3.5 border-b theme-border bg-[var(--bg-card-subtle)] flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--text-main)]">
            {isRTL
              ? `قائمة فواتير المصروفات (${data?.items.length ?? 0} قيد)`
              : `Expense & purchase vouchers (${data?.items.length ?? 0})`}
          </span>
          <span className="text-[var(--text-muted)] font-mono" dir="ltr">
            {periodLabel}
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[920px] text-start text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)] font-bold whitespace-nowrap">
                <th className="px-4 py-3.5">{ui(t("purchases.supplier"))}</th>
                <th className="px-4 py-3.5">{ui(t("purchases.category"))}</th>
                <th className="px-4 py-3.5">{text("حالة السداد", "Payment")}</th>
                <th className="px-4 py-3.5">{ui(t("purchases.date"))}</th>
                <th className="px-4 py-3.5">{ui(t("purchases.subtotal"))}</th>
                <th className="px-4 py-3.5">{ui(t("purchases.recoverableVat"))}</th>
                <th className="px-4 py-3.5">{ui(t("purchases.total"))}</th>
                <th className="px-4 py-3.5 text-end">{ui(t("common.actions"))}</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {data?.items.map((row) => {
                const isReturn = row.documentType === "PURCHASE_RETURN";
                const isVoided = Boolean(row.voidedAt);
                const isDraft = row.postingStatus === "DRAFT";
                const payMeta =
                  !isVoided && !isReturn && !isDraft && row.paymentSummary
                    ? paymentStatusMeta(row.paymentSummary.status, !isRTL, "PURCHASE")
                    : null;
                const canPayRow =
                  canWriteAccounting &&
                  !isVoided &&
                  !isReturn &&
                  row.postingStatus === "POSTED" &&
                  Boolean(payMeta?.canPay);

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-[var(--table-row-hover)] transition duration-150 ${
                      isVoided ? "bg-rose-500/5 text-[var(--text-muted)]" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-[var(--text-main)] font-bold">
                            {row.supplierName}
                          </strong>
                          {isReturn && (
                            <Badge variant="destructive" className="text-[11px] gap-1">
                              <RotateCcw className="w-3 h-3" aria-hidden="true" />
                              <span>{ui("مرتجع")}</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] font-mono">
                          <bdi className="text-[var(--accent-gold)] font-bold">
                            {row.voucher}
                          </bdi>{" "}
                          · <bdi>{row.invoiceNumber}</bdi>
                        </p>
                        {isVoided && (
                          <p className="text-xs text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                            <span>
                              {ui("ملغى:")} {row.voidReason}
                            </span>
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                      <span className="px-2 py-1 rounded-lg bg-[var(--bg-card-subtle)] border theme-border font-bold text-[var(--text-main)]">
                        {ui(EXPENSE_CATEGORIES[row.category])}
                      </span>
                      {row.vehiclePlate && (
                        <span className="mt-1 flex items-center gap-1 text-xs font-mono text-[var(--text-muted)]">
                          <Truck
                            className="w-3 h-3 text-[var(--accent-gold)]"
                            aria-hidden="true"
                          />
                          <span>{row.vehiclePlate}</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {isVoided ? (
                        <Badge variant="destructive" className="text-[11px]">
                          {text("ملغى", "Voided")}
                        </Badge>
                      ) : isDraft ? (
                        <Badge variant="outline" className="text-[11px]">
                          {text("مسودة للمراجعة", "Draft")}
                        </Badge>
                      ) : isReturn ? (
                        <Badge variant="secondary" className="text-[11px]">
                          {text("مرتجع", "Return")}
                        </Badge>
                      ) : payMeta ? (
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={payMeta.variant} className="text-[11px]">
                            {payMeta.label}
                          </Badge>
                          {(row.paymentSummary?.status === "PARTIAL" ||
                            row.paymentSummary?.status === "UNPAID") && (
                            <span
                              className="text-[11px] font-mono text-[var(--text-muted)]"
                              dir="ltr"
                            >
                              {text("متبقي", "Due")}:{" "}
                              {formatMoneyValue(row.paymentSummary.balance)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap">
                      <bdi dir="ltr" className="text-[var(--text-main)] block">
                        {row.issueDate}
                      </bdi>
                      {row.vatDate !== row.issueDate && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {ui("الضريبة:")} <bdi dir="ltr">{row.vatDate}</bdi>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Money
                        amount={signedPurchaseAmount(row.netAmount, isReturn)}
                        color="muted"
                        size="xs"
                      />
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Money
                        amount={signedPurchaseAmount(row.recoverableVat, isReturn)}
                        color="emerald"
                        size="xs"
                      />
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Money
                        amount={signedPurchaseAmount(row.totalAmount, isReturn)}
                        color={isReturn ? "rose" : "default"}
                        size="sm"
                      />
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-end">
                      <div className="inline-flex items-center gap-1.5">
                        {canPayRow && (
                          <button
                            type="button"
                            onClick={() => setPaymentTarget(row)}
                            className="inline-flex min-h-11 sm:min-h-8 items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-600/35 bg-emerald-500/12 hover:border-emerald-600 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:hover:border-emerald-500 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
                          >
                            <CreditCard className="size-3.5" aria-hidden="true" />
                            <span>{text("تسجيل سداد", "Pay")}</span>
                          </button>
                        )}

                        <ActionMenu label={`${text("إجراءات", "Actions")} ${row.invoiceNumber}`}>
                          <ActionMenuItem
                            icon={<History className="size-3.5" />}
                            onClick={() => setHistory(row.id)}
                          >
                            {text("التفاصيل والمرفقات", "Details & attachments")}
                          </ActionMenuItem>
                          {canWrite && !row.voidedAt && (
                            <ActionMenuItem
                              icon={<Pencil className="size-3.5" />}
                              tone="gold"
                              onClick={() => setEditor(row)}
                            >
                              {ui(t("common.edit"))}
                            </ActionMenuItem>
                          )}
                        </ActionMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden p-3.5 space-y-3">
          {data?.items.map((row) => {
            const isReturn = row.documentType === "PURCHASE_RETURN";
            const isVoided = Boolean(row.voidedAt);
            const isDraft = row.postingStatus === "DRAFT";
            const payMeta =
              !isVoided && !isReturn && !isDraft && row.paymentSummary
                ? paymentStatusMeta(row.paymentSummary.status, !isRTL, "PURCHASE")
                : null;
            const canPayRow =
              canWriteAccounting &&
              !isVoided &&
              !isReturn &&
              row.postingStatus === "POSTED" &&
              Boolean(payMeta?.canPay);

            return (
              <MobileRecordCard
                key={row.id}
                muted={isVoided}
                title={row.supplierName}
                subtitle={
                  <span className="font-mono">
                    <bdi className="text-[var(--accent-gold)] font-bold">
                      {row.voucher}
                    </bdi>{" "}
                    · <bdi>{row.invoiceNumber}</bdi> ·{" "}
                    <bdi dir="ltr">{row.issueDate}</bdi>
                  </span>
                }
                badge={
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {isReturn ? (
                      <Badge
                        variant="destructive"
                        className="text-[11px] gap-1 shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        <span>{ui("مرتجع")}</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[11px] shrink-0">
                        {ui(EXPENSE_CATEGORIES[row.category])}
                      </Badge>
                    )}
                    {payMeta && (
                      <Badge variant={payMeta.variant} className="text-[11px]">
                        {payMeta.label}
                      </Badge>
                    )}
                  </div>
                }
                footer={
                  <>
                    {canPayRow && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 min-h-11 gap-1.5 border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:text-emerald-300 text-xs font-bold"
                        onClick={() => setPaymentTarget(row)}
                      >
                        <CreditCard className="size-3.5" aria-hidden="true" />
                        <span>{text("تسجيل سداد", "Pay")}</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 min-h-11 gap-1.5 text-xs font-bold"
                      onClick={() => setHistory(row.id)}
                    >
                      <History
                        className="size-3.5 text-[var(--text-muted)]"
                        aria-hidden="true"
                      />
                      <span>{ui("السجل والمرفقات")}</span>
                    </Button>
                    {canWrite && !row.voidedAt && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 gap-1.5 text-xs font-bold"
                        onClick={() => setEditor(row)}
                      >
                        <Pencil
                          className="size-3.5 text-[var(--accent-gold)]"
                          aria-hidden="true"
                        />
                        <span>{ui("تعديل")}</span>
                      </Button>
                    )}
                  </>
                }
              >
                <MobileCardMetaGrid columns={3}>
                  <MobileCardField
                    label={ui(t("purchases.subtotal"))}
                    value={
                      <Money
                        amount={signedPurchaseAmount(row.netAmount, isReturn)}
                        size="xs"
                        color="muted"
                      />
                    }
                  />
                  <MobileCardField
                    label={
                      row.paymentSummary &&
                      (row.paymentSummary.status === "PARTIAL" ||
                        row.paymentSummary.status === "UNPAID")
                        ? text("المتبقي", "Due")
                        : ui(t("purchases.recoverableVat"))
                    }
                    value={
                      <Money
                        amount={
                          row.paymentSummary &&
                          (row.paymentSummary.status === "PARTIAL" ||
                            row.paymentSummary.status === "UNPAID")
                            ? row.paymentSummary.balance
                            : signedPurchaseAmount(row.recoverableVat, isReturn)
                        }
                        size="xs"
                        color={
                          row.paymentSummary &&
                          (row.paymentSummary.status === "PARTIAL" ||
                            row.paymentSummary.status === "UNPAID")
                            ? "amber"
                            : "emerald"
                        }
                      />
                    }
                  />
                  <MobileCardField
                    label={ui(t("purchases.total"))}
                    value={
                      <Money
                        amount={signedPurchaseAmount(row.totalAmount, isReturn)}
                        color={isReturn ? "rose" : "default"}
                        size="sm"
                      />
                    }
                  />
                </MobileCardMetaGrid>

                {row.vehiclePlate && (
                  <p className="flex items-center gap-1 text-xs font-mono text-[var(--text-muted)]">
                    <Truck
                      className="w-3 h-3 text-[var(--accent-gold)] shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      {ui("المركبة:")} {row.vehiclePlate}
                    </span>
                  </p>
                )}

                {isVoided && (
                  <p className="text-xs text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>
                      {ui("ملغى:")} {row.voidReason}
                    </span>
                  </p>
                )}
              </MobileRecordCard>
            );
          })}
        </div>

        {isLoading && (
          <div role="status" className="space-y-3 p-8">
            {[1, 2, 3].map((val) => (
              <div
                key={val}
                className="theme-card-subtle h-12 animate-pulse rounded-xl"
              />
            ))}
            <span className="sr-only">{ui("جارٍ تحميل فواتير الموردين")}</span>
          </div>
        )}

        {data?.items.length === 0 && !isLoading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-main)]">
              {ui("لا توجد فواتير موردين مسجلة لهذه الفترة")}
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {ui(
                "سجّل مصروفات الوقود والصيانة وتكاليف الأسطول لاحتساب ضريبة المدخلات تلقائياً في الإقرار الضريبي.",
              )}
            </p>
            {canWrite && (
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setEditor("NEW");
                }}
                className="inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-xl gold-gradient-btn text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{ui("تسجيل أول مصروف")}</span>
              </button>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t theme-border bg-[var(--bg-card-subtle)] flex items-center justify-between gap-4 text-xs">
          <button
            type="button"
            disabled={isLoading || page === 1}
            onClick={() => setPage((v) => v - 1)}
            className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card)] font-bold text-[var(--text-main)] disabled:opacity-40 hover:border-[var(--accent-gold)] transition cursor-pointer"
          >
            {ui(t("common.back"))}
          </button>

          <span className="font-bold text-[var(--text-muted)]">
            {data?.total ?? 0} · {ui(t("common.page"))}{" "}
            <span className="font-mono text-[var(--text-main)]">{page}</span>
          </span>

          <button
            type="button"
            disabled={isLoading || !data || page * 30 >= data.total}
            onClick={() => setPage((v) => v + 1)}
            className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card)] font-bold text-[var(--text-main)] disabled:opacity-40 hover:border-[var(--accent-gold)] transition cursor-pointer"
          >
            {ui(t("common.next"))}
          </button>
        </div>
      </div>

      {/* Editor Modal */}
      {canWrite && editor && (
        <PurchaseForm
          key={typeof editor === "string" ? editor : editor.id}
          existing={typeof editor === "string" ? undefined : editor}
          initialDocumentType={
            editor === "NEW_RETURN" ? "PURCHASE_RETURN" : "PURCHASE_INVOICE"
          }
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}

      {/* History & Attachments Modal */}
      {history && (
        <PurchaseHistory
          id={history}
          onClose={() => setHistory(null)}
          onVoided={() => {
            setHistory(null);
            setReload((value) => value + 1);
            setMessage(
              isRTL
                ? "تم إلغاء القيد مع الاحتفاظ بسجل المراجعة."
                : "Purchase entry voided while retaining audit history.",
            );
          }}
        />
      )}

      {/* Quick Supplier Payment Modal */}
      {canWriteAccounting && paymentTarget && (
        <RecordPaymentModal
          isOpen={Boolean(paymentTarget)}
          documentType="PURCHASE"
          invoiceId={paymentTarget.id}
          invoiceNumber={paymentTarget.invoiceNumber}
          customerName={paymentTarget.supplierName}
          totalAmount={paymentTarget.totalAmount}
          onClose={() => setPaymentTarget(null)}
          onPaymentSuccess={() => {
            setReload((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}
