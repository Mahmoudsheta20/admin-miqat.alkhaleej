"use client";
import { useApiQuery } from "@/lib/use-api-query";
import { useUrlState } from "@/lib/use-url-state";
import { useUiText } from "@/lib/ui-text";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ReceiptText,
  Plus,
  Building2,
  FileSpreadsheet,
  Download,
  Eye,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  CreditCard,
  TrendingUp,
  FileMinus,
  FilePlus,
  SlidersHorizontal,
  Archive,
  RotateCcw,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionMenu, ActionMenuItem, ActionMenuSeparator } from "@/components/ui/action-menu";
import { currentSaudiPeriod, paymentStatusMeta } from "@/lib/accounting";
import {
  buildInvoiceListQueryPath,
  canIssueTaxAdjustment,
  dateLabel,
  downloadInvoice,
  filterInvoiceRows,
  hasInvertedDateRange,
  invoiceTitle,
  quickInvoiceDateRange,
  summarizeInvoicePage,
  type InvoiceListFilterType,
  type InvoicePaymentFilter,
  type InvoiceRow,
} from "@/lib/invoices";
import { formatMoneyValue } from "@/app/_components/ui/Money";
import InvoiceVisibilityAction from "./invoice-visibility-action";
import RecordPaymentModal from "./record-payment-modal";
import { useLanguage } from "@/lib/languageContext";
import { useAuth } from "@/lib/authContext";
import { hasClientPermission } from "@/lib/permissions";
import {
  PageHeader,
  StatCard,
  StatRow,
  FilterBar,
  Money,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/app/_components/ui";
import {
  MobileCardField,
  MobileCardMetaGrid,
  MobileRecordCard,
} from "@/app/_components/mobile";

interface InvoiceList {
  items: InvoiceRow[];
  total: number;
  page: number;
}

function formatDecimalCommas(value: string): string {
  const [whole, decimals] = value.split(".");
  return decimals === undefined
    ? value
    : `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimals}`;
}

export default function InvoicesPage() {
  const ui = useUiText();

  const { t, dir, isRTL } = useLanguage();
  const text = (ar: string, en: string) => (isRTL ? ar : en);
  const { user: authUser } = useAuth();
  const canCreateInvoices = hasClientPermission(authUser, "invoices", "write");
  const canDeleteInvoices = hasClientPermission(authUser, "invoices", "delete");
  const canWriteAccounting = hasClientPermission(authUser, "accounting", "write");
  const canViewCompanySettings = hasClientPermission(authUser, "companySettings", "view");
  const [page, setPage] = useUrlState<number>("page", 1);
  const [isArchived, setIsArchived] = useUrlState<boolean>("archived", false);

  // URL-synced filters (queried server-side and applied locally for instant/fixture parity)
  const [search, setSearch] = useUrlState<string>("q", "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [typeFilter, setTypeFilter] = useUrlState<InvoiceListFilterType>(
    "type",
    "ALL",
    ["ALL", "BOOKING", "PROFORMA", "TAX", "NOTES"],
  );
  const [payFilter, setPayFilter] = useUrlState<InvoicePaymentFilter>(
    "payStatus",
    "ALL",
    ["ALL", "UNPAID", "PARTIAL", "PAID"],
  );
  const [fromDate, setFromDate] = useUrlState<string>("fromDate", "");
  const [toDate, setToDate] = useUrlState<string>("toDate", "");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState("");
  const [visibilityTarget, setVisibilityTarget] = useState<InvoiceRow | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Payment Modal State
  const [paymentModalInvoice, setPaymentModalInvoice] =
    useState<InvoiceRow | null>(null);

  const [actionError, setError] = useState("");
  const queryPath = useMemo(
    () =>
      buildInvoiceListQueryPath({
        page,
        archived: isArchived,
        type: typeFilter,
        search: debouncedSearch,
        fromDate,
        toDate,
      }),
    [page, isArchived, typeFilter, debouncedSearch, fromDate, toDate],
  );
  const {
    data,
    error: queryError,
    isLoading,
    refetch,
  } = useApiQuery<InvoiceList>(queryPath);
  const error = actionError || queryError;
  const isRefreshing = isLoading;
  const load = (showRefresh = false) => {
    if (showRefresh) setError("");
    refetch();
  };

  const items = useMemo(() => data?.items ?? [], [data]);
  const invertedDates = hasInvertedDateRange(fromDate, toDate);
  const moreFiltersCount = (fromDate || toDate ? 1 : 0) + (isArchived ? 1 : 0);
  const moreFiltersOpen = showMoreFilters || moreFiltersCount > 0;
  const hasActiveFilters = Boolean(
    search.trim() || typeFilter !== "ALL" || payFilter !== "ALL" || fromDate || toDate || isArchived,
  );
  const todaySaudi = currentSaudiPeriod().day;

  const clearAllFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("ALL");
    setPayFilter("ALL");
    setFromDate("");
    setToDate("");
    setIsArchived(false);
    setPage(1);
  };

  const applyDatePreset = (preset: "THIS_MONTH" | "THIS_QUARTER") => {
    const range = quickInvoiceDateRange(preset, todaySaudi);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setPage(1);
  };

  const filteredItems = useMemo(
    () =>
      filterInvoiceRows(items, {
        type: typeFilter,
        paymentStatus: payFilter,
        search,
        fromDate,
        toDate,
      }),
    [items, typeFilter, payFilter, search, fromDate, toDate],
  );

  const stats = useMemo(
    () => summarizeInvoicePage(items, data?.total),
    [items, data?.total],
  );

  const handleCopyNumber = async (invoiceNumber: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invoiceNumber);
      }
      setCopiedNumber(invoiceNumber);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopiedNumber((curr) => (curr === invoiceNumber ? null : curr));
      }, 2000);
    } catch {
      setError(
        text(
          "تعذر نسخ رقم الفاتورة إلى الحافظة.",
          "Could not copy the invoice number to clipboard.",
        ),
      );
    }
  };

  const handleDownloadPdf = async (row: InvoiceRow) => {
    setDownloadingId(row.id);
    setError("");
    try {
      await downloadInvoice(row.id);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "تعذر تنزيل الفاتورة؛ حاول مرة أخرى",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / 30));

  const invoiceHelpGuide = useMemo(
    () => ({
      title: isRTL
        ? "دليل الفواتير والمستندات المالية"
        : "Invoicing & Financial Documents Guide",
      summary: isRTL
        ? "يجمع هذا القسم كافة فواتير المبيعات الصادرة عن شركة ميقات الخليج للنقل البري، مع تنظيم متابعة المبالغ المحصلة والمتبقية وإشعارات التعديل."
        : "Consolidates all sales invoices issued by Miqat Al-Khaleej, organizing payment tracking, remaining balances, and credit/debit adjustment notes.",
      cards: [
        {
          title: isRTL ? "١. أنواع المستندات" : "1. Document Types",
          badge: isRTL ? "المبيعات" : "Sales",
          items: [
            {
              label: isRTL ? "فاتورة للعميل" : "Customer Tax Invoice",
              description: isRTL
                ? "فاتورة نهائية معتمدة للرحلات وعقود النقل، تُثبت الإيراد والضريبة وتحتوي على رمز الفاتورة الضريبية ZATCA QR."
                : "Final approved invoice establishing revenue and VAT, containing official ZATCA QR code.",
            },
            {
              label: isRTL ? "فاتورة مبدئية (عرض سعر)" : "Proforma Invoice",
              description: isRTL
                ? "مستند أولي للعميل يتضمن تفاصيل الخدمة والآيبان البنكي (SNB) ولا يؤثر على القيود المحاسبية إلا بعد اعتماده."
                : "Initial quotation with service details and SNB IBAN; does not post to ledger until approved.",
            },
            {
              label: isRTL ? "إشعار دائن / مدين" : "Credit / Debit Note",
              description: isRTL
                ? "إشعار دائن لخفض القيمة أو إلغاء رحلة، وإشعار مدين لإضافة مبالغ لاحقة، مع ارتباط كامل برقم الفاتورة الأصلية."
                : "Credit note to reduce value or cancel, and debit note to add amounts, linked to original invoice ref.",
            },
          ],
        },
        {
          title: isRTL ? "٢. متابعة السداد والتحصيل" : "2. Payment Tracking",
          badge: isRTL ? "سندات القبض" : "Receipt Vouchers",
          items: [
            {
              label: isRTL ? "المتبقي على العميل" : "Remaining Balance",
              description: isRTL
                ? "يُحمل المبلغ غير المسدد على ذمم العملاء (1103)، وعند استلام دفعة يُسجل سند قبض فوري يخفض الرصيد."
                : "Unpaid amounts sit on Accounts Receivable (1103); recording a payment issues a voucher reducing AR.",
            },
            {
              label: isRTL ? "زر «تسجيل دفعة»" : "Record Payment Action",
              description: isRTL
                ? "يمكن تسجيل دفعة نقدية بالصندوق (1101) أو تحويل بنكي (1102) مباشرة من جدول الفواتير أو صفحة التفاصيل."
                : "Directly record cash (1101) or bank transfer (1102) from invoice table or details page.",
            },
          ],
        },
        {
          title: isRTL
            ? "٣. الحماية ومشاركة الفاتورة"
            : "3. Protection & Sharing",
          badge: isRTL ? "محفوظة في النظام" : "System Protected",
          items: [
            {
              label: isRTL
                ? "عدم القابلية للتعديل المباشر"
                : "Immutable Document",
              description: isRTL
                ? "الفاتورة المصدرة مستند مالي ثابت؛ أي تعديل يتم بمسار نظامي عبر إصدار إشعار دائن أو مدين."
                : "Issued invoice is fixed; adjustments must follow official paths via credit or debit notes.",
            },
            {
              label: isRTL
                ? "نسخة العميل ورابط التحقق"
                : "Customer Copy & Verification",
              description: isRTL
                ? "تنزيل PDF رسمي مجهز للطباعة أو نسخ رابط التحقق المباشر لمشاركته مع العميل عبر الواتساب أو الإيميل."
                : "Download print-ready official PDF or copy direct verification link to share via WhatsApp or Email.",
            },
          ],
        },
      ],
      tip: isRTL
        ? "لتعديل فاتورة تم إصدارها سابقاً، اضغط على «عرض» ثم اختر «خفض قيمة الفاتورة (إشعار دائن)» أو «إضافة مبلغ (إشعار مدين)»."
        : "To adjust an issued invoice, click 'View' and choose 'Credit Note' or 'Debit Note'.",
    }),
    [isRTL],
  );

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      {/* 1. Unified Page Header */}
      <PageHeader
        icon={ReceiptText}
        badge={t("section.financeDaily")}
        title={ui(t("invoice.title"))}
        subtitle={ui(t("invoice.subtitle"))}
        primaryAction={
          canCreateInvoices
            ? {
                label: t("invoice.newInvoice"),
                href: "/admin/invoices/new",
                icon: Plus,
              }
            : undefined
        }
        secondaryActions={(() => {
          const actions = [
            ...(canCreateInvoices
              ? [
                  {
                    label: `+ ${t("invoice.proforma")}`,
                    href: "/admin/invoices/new?type=PROFORMA",
                    icon: FileSpreadsheet,
                    variant: "subtle" as const,
                  },
                ]
              : []),
            ...(canViewCompanySettings
              ? [
                  {
                    label: text("الشركة والبنك", "Company & bank"),
                    href: "/admin/invoices/settings",
                    icon: Building2,
                  },
                ]
              : []),
          ];
          return actions.length > 0 ? actions : undefined;
        })()}
        helpGuide={invoiceHelpGuide}
        onRefresh={() => void load(true)}
        isRefreshing={isLoading || isRefreshing}
        onSeeded={(msg) => {
          setError("");
          setSeedMessage(msg);
          void load(true);
        }}
        onSeedError={(err) => {
          setSeedMessage("");
          setError(err);
        }}
      />

      {/* 2. Alerts (only shown when active) */}
      {seedMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-600/35 bg-emerald-500/12 dark:border-emerald-500/35 dark:bg-emerald-950/45 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300"
        >
          {ui(seedMessage)}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle
              className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0"
              aria-hidden="true"
            />
            <span>{ui(error)}</span>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            className="min-h-11 sm:min-h-9 px-3.5 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition shrink-0 cursor-pointer"
          >
            {ui(t("common.retry"))}
          </button>
        </div>
      )}

      {/* 3. Streamlined KPI Cards */}
      <StatRow>
        <StatCard
          label={ui(t("invoice.totalInvoices"))}
          value={stats.total}
          subtext={t("invoice.savedInSystem")}
          icon={ReceiptText}
          isActive={typeFilter === "ALL"}
          onClick={() => {
            setTypeFilter("ALL");
            setPage(1);
          }}
          isLoading={isLoading && !data}
        />
        <StatCard
          label={text("الفواتير الضريبية", "Tax Invoices")}
          value={stats.taxCount}
          subtext={`${text("ضريبية", "Tax")}: ${stats.taxCount} · ${text("حجز", "Booking")}: ${stats.bookingCount}`}
          icon={Check}
          variant="emerald"
          isActive={typeFilter === "TAX"}
          onClick={() => {
            setTypeFilter(typeFilter === "TAX" ? "ALL" : "TAX");
            setPage(1);
          }}
          isLoading={isLoading && !data}
        />
        <StatCard
          label={ui(t("invoice.proformaInvoices"))}
          value={stats.proformaCount}
          subtext={t("invoice.proforma")}
          icon={FileSpreadsheet}
          variant="blue"
          isActive={typeFilter === "PROFORMA"}
          onClick={() => {
            setTypeFilter("PROFORMA");
            setPage(1);
          }}
          isLoading={isLoading && !data}
        />
        <StatCard
          label={ui(t("invoice.netSales"))}
          value={formatDecimalCommas(stats.pageGrossSum)}
          unit={t("common.sar")}
          subtext={`${t("invoice.salesTax")}: ${formatDecimalCommas(stats.pageVatSum)} ${t("common.sar")}`}
          icon={TrendingUp}
          variant="amber"
          isLoading={isLoading && !data}
        />
      </StatRow>

      {/* 4. Unified Filter Bar */}
      <FilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          if (page !== 1) setPage(1);
        }}
        searchPlaceholder={ui(t("invoice.searchPlaceholder"))}
        tabs={[
          { id: "ALL", label: t("common.all"), count: items.length },
          {
            id: "TAX",
            label: text("ضريبية", "Tax"),
            count: stats.taxCount,
          },
          {
            id: "BOOKING",
            label: text("فواتير الحجز", "Booking"),
            count: stats.bookingCount,
          },
          {
            id: "PROFORMA",
            label: t("invoice.proformaInvoices"),
            count: stats.proformaCount,
          },
          {
            id: "NOTES",
            label: t("invoice.notesCount"),
            count: stats.notesCount,
          },
        ]}
        activeTab={typeFilter}
        onTabChange={(tabId) => {
          setTypeFilter(tabId as typeof typeFilter);
          setPage(1);
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={text("تصفية بحالة السداد", "Filter by payment status")}
            className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] p-1"
          >
            {(
              [
                ["ALL", text("كل الحالات", "All statuses")],
                ["UNPAID", text("غير مدفوعة", "Unpaid")],
                ["PARTIAL", text("جزئي", "Partial")],
                ["PAID", text("مدفوعة", "Paid")],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={payFilter === id}
                onClick={() => {
                  setPayFilter(id);
                  setPage(1);
                }}
                className={`min-h-9 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  payFilter === id
                    ? "bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/45"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-expanded={moreFiltersOpen}
            onClick={() => setShowMoreFilters((v) => !v)}
            className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-bold transition cursor-pointer ${
              moreFiltersOpen
                ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{text("تصفية متقدمة", "More filters")}</span>
            {moreFiltersCount > 0 && (
              <span className="rounded-full bg-[var(--accent-gold)] text-white px-1.5 py-0.5 font-mono text-[10px] leading-none">
                {moreFiltersCount}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex min-h-11 sm:min-h-9 items-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{text("مسح التصفية", "Clear")}</span>
            </button>
          )}
        </div>
      </FilterBar>

      {moreFiltersOpen && (
        <div className="theme-card rounded-2xl border theme-border p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applyDatePreset("THIS_MONTH")}
              className="min-h-10 sm:min-h-8 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-gold)] cursor-pointer transition"
            >
              {text("هذا الشهر", "This month")}
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("THIS_QUARTER")}
              className="min-h-10 sm:min-h-8 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-gold)] cursor-pointer transition"
            >
              {text("هذا الربع", "This quarter")}
            </button>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
              <span>{text("من", "From")}</span>
              <input
                type="date"
                value={fromDate}
                aria-label={text("تاريخ البداية", "From date")}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                dir="ltr"
                className="min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] bg-[var(--bg-input)] px-2.5 py-1 text-xs font-mono text-[var(--text-main)] outline-none focus:border-[var(--accent-gold)]"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
              <span>{text("إلى", "To")}</span>
              <input
                type="date"
                value={toDate}
                aria-label={text("تاريخ النهاية", "To date")}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                dir="ltr"
                className="min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] bg-[var(--bg-input)] px-2.5 py-1 text-xs font-mono text-[var(--text-main)] outline-none focus:border-[var(--accent-gold)]"
              />
            </label>
          </div>

          <label className="inline-flex min-h-11 sm:min-h-9 items-center gap-2.5 text-xs sm:text-[0.8125rem] font-bold cursor-pointer">
            <Checkbox
              checked={isArchived}
              onChange={(event) => {
                setIsArchived(event.target.checked);
                setPage(1);
              }}
            />
            <span>
              {isRTL ? "عرض الفواتير المحذوفة" : "Show removed invoices"}
            </span>
          </label>
        </div>
      )}

      {invertedDates && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-800 dark:text-amber-300">
          {text(
            "تاريخ البداية بعد تاريخ النهاية — لن تُطبَّق تصفية التاريخ حتى تصحيح النطاق.",
            "From date is after To date — date range filter is paused until corrected.",
          )}
        </p>
      )}
      {isArchived && (
        <p className="rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] p-4 text-sm font-medium text-[var(--text-main)]">
          {isRTL
            ? "هذه الفواتير مخفية من القائمة فقط. مستنداتها ودفعاتها وحساب الضريبة محفوظة."
            : "These invoices are hidden from the list only. Their documents, payments and VAT records are retained."}
        </p>
      )}
      {/* Invoices List Container */}
      <div className="theme-card rounded-2xl sm:rounded-3xl border theme-border overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b theme-border bg-[var(--bg-card-subtle)] flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--text-main)]">
            {ui(t("invoice.title"))} ({filteredItems.length}{" "}
            {ui(t("common.of"))} {data?.total || 0})
          </span>
          <span className="text-[var(--text-muted)] font-mono">
            {ui(t("common.page"))} {page} {ui(t("common.of"))} {totalPages}
          </span>
        </div>

        {!data && !error ? (
          <div
            role="status"
            className="p-12 flex flex-col items-center justify-center gap-3"
          >
            <div className="w-9 h-9 border-3 border-[var(--accent-gold)]/25 border-t-[var(--accent-gold)] rounded-full animate-spin" />
            <p className="text-xs font-bold text-[var(--text-muted)]">
              {ui(t("common.loading"))}
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center mx-auto">
              <ReceiptText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-main)]">
              {ui(
                items.length === 0 && !hasActiveFilters && !isArchived
                  ? "لا توجد فواتير حتى الآن."
                  : "لا توجد فواتير مطابقة للبحث",
              )}
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {ui(
                items.length === 0 && !hasActiveFilters && !isArchived
                  ? "ابدأ بإنشاء فاتورة جديدة أو فاتورة مبدئية وسيتم حفظها مع رمز الفاتورة الضريبية ZATCA QR ونسخة PDF للعميل."
                  : "جرب تعديل كلمات البحث أو تغيير تصفية نوع الفاتورة.",
              )}
            </p>
            {items.length === 0 && !hasActiveFilters && !isArchived ? (
              canCreateInvoices ? (
                <Link
                  href="/admin/invoices/new"
                  className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-4 py-1.5 rounded-lg gold-gradient-btn text-xs font-bold shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{ui(t("invoice.newInvoice"))}</span>
                </Link>
              ) : null
            ) : (
              <button
                type="button"
                onClick={clearAllFilters}
                className="min-h-11 sm:min-h-9 px-4 py-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-xs font-bold text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition cursor-pointer"
              >
                {text("مسح التصفية", "Clear filters")}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table (shadcn Table) */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)] font-bold whitespace-nowrap">
                    <TableHead className="py-3.5 px-4">
                      {ui(t("invoice.number"))}
                    </TableHead>
                    <TableHead className="py-3.5 px-4">
                      {ui(t("invoice.typeAndStatus"))}
                    </TableHead>
                    <TableHead className="py-3.5 px-4">
                      {ui(t("invoice.customer"))}
                    </TableHead>
                    <TableHead className="py-3.5 px-4">
                      {ui(t("invoice.subtotal"))}
                    </TableHead>
                    <TableHead className="py-3.5 px-4">
                      {ui(t("invoice.vat"))}
                    </TableHead>
                    <TableHead className="py-3.5 px-4">
                      {ui(t("invoice.total"))}
                    </TableHead>
                    <TableHead className="py-3.5 px-4">
                      {ui(t("invoice.date"))}
                    </TableHead>
                    <TableHead className={`py-3.5 px-4 ${"text-end"}`}>
                      {ui(t("common.actions"))}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y theme-border">
                  {filteredItems.map((row) => {
                    const docType = row.documentType || "BOOKING";
                    const isProforma = docType === "PROFORMA";
                    const isCredit = row.taxDocument?.kind === "CREDIT";
                    const isDebit = row.taxDocument?.kind === "DEBIT";
                    const isDownloadingThis = downloadingId === row.id;
                    const payMeta = row.paymentSummary
                      ? paymentStatusMeta(row.paymentSummary.status, !isRTL, "SALE")
                      : null;
                    const canPayRow =
                      canWriteAccounting &&
                      !isArchived &&
                      !isProforma &&
                      !isCredit &&
                      !isDebit &&
                      (payMeta ? payMeta.canPay : true);
                    const canAdjustRow = canCreateInvoices && !isArchived && canIssueTaxAdjustment(row);

                    return (
                      <TableRow
                        key={row.id}
                        className="hover:bg-[var(--table-row-hover)] transition duration-150"
                      >
                        <TableCell className="py-3.5 px-4 whitespace-nowrap">
                          <Link
                            href={`/admin/invoices/${row.id}`}
                            className="text-[var(--accent-gold)] font-semibold font-mono text-sm hover:underline"
                            dir="ltr"
                          >
                            {row.invoiceNumber}
                          </Link>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                isCredit
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                                  : isDebit
                                    ? "bg-[var(--accent-surface)] text-[var(--accent-gold)] border-[var(--accent-gold)]/35"
                                    : isProforma
                                      ? "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-600/25"
                                      : "bg-[var(--bg-card-subtle)] text-[var(--text-main)] border theme-border"
                              }`}
                            >
                              {isCredit ? (
                                <>
                                  <FileMinus
                                    className="w-3 h-3"
                                    aria-hidden="true"
                                  />
                                  <span>{ui("إشعار دائن (خفض)")}</span>
                                </>
                              ) : isDebit ? (
                                <>
                                  <FilePlus
                                    className="w-3 h-3"
                                    aria-hidden="true"
                                  />
                                  <span>{ui("إشعار مدين (إضافة)")}</span>
                                </>
                              ) : (
                                ui(invoiceTitle(row))
                              )}
                            </span>
                            {payMeta && (
                              <div className="flex items-center gap-1.5">
                                <Badge variant={payMeta.variant} className="text-[11px]">
                                  {payMeta.label}
                                </Badge>
                                {(row.paymentSummary?.status === "PARTIAL" || row.paymentSummary?.status === "UNPAID") && (
                                  <span className="text-[11px] font-mono text-[var(--text-muted)]" dir="ltr">
                                    {text("متبقي", "Due")}: {formatMoneyValue(row.paymentSummary.balance)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-xl bg-[var(--bg-card-subtle)] border theme-border text-[var(--text-muted)] font-bold text-xs flex items-center justify-center shrink-0"
                              aria-hidden="true"
                            >
                              {row.customerName
                                ? row.customerName.trim().charAt(0)
                                : "ع"}
                            </div>
                            <span className="font-bold text-[var(--text-main)] truncate max-w-[200px]">
                              {row.customerName}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 whitespace-nowrap">
                          <Money
                            amount={row.netAmount}
                            color="muted"
                            size="xs"
                          />
                        </TableCell>

                        <TableCell className="py-3.5 px-4 whitespace-nowrap">
                          <Money
                            amount={row.vatAmount}
                            color="muted"
                            size="xs"
                          />
                        </TableCell>

                        <TableCell className="py-3.5 px-4 whitespace-nowrap">
                          <Money
                            amount={row.totalAmount}
                            negative={isCredit}
                            color={isCredit ? "rose" : "default"}
                            size="sm"
                          />
                        </TableCell>

                        <TableCell
                          className="py-3.5 px-4 whitespace-nowrap text-[var(--text-muted)] font-mono text-xs"
                          dir="ltr"
                        >
                          {dateLabel(row.invoiceDate, ui.language)}
                        </TableCell>

                        <TableCell className="py-3.5 px-4 whitespace-nowrap text-end">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/admin/invoices/${row.id}`}
                              className="inline-flex min-h-11 sm:min-h-8 items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] text-[var(--text-main)] text-xs font-bold transition"
                              title={ui(t("common.view"))}
                            >
                              <Eye
                                className="w-3.5 h-3.5 text-[var(--accent-gold)]"
                                aria-hidden="true"
                              />
                              <span>{ui(t("common.view"))}</span>
                            </Link>

                            <button
                              type="button"
                              disabled={isDownloadingThis}
                              onClick={() => void handleDownloadPdf(row)}
                              className="inline-flex min-h-11 sm:min-h-8 items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] hover:border-[var(--accent-gold)] text-[var(--accent-gold)] text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                              title={ui(t("common.downloadPdf"))}
                            >
                              {isDownloadingThis ? (
                                <Loader2
                                  className="w-3.5 h-3.5 animate-spin"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Download
                                  className="w-3.5 h-3.5"
                                  aria-hidden="true"
                                />
                              )}
                              <span>PDF</span>
                            </button>

                            {canPayRow && (
                              <button
                                type="button"
                                onClick={() => setPaymentModalInvoice(row)}
                                className="inline-flex min-h-11 sm:min-h-8 items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-600/35 bg-emerald-500/12 hover:border-emerald-600 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:hover:border-emerald-500 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
                                title={ui(t("invoice.recordPayment"))}
                              >
                                <CreditCard
                                  className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300"
                                  aria-hidden="true"
                                />
                                <span>{ui(t("invoice.recordPayment"))}</span>
                              </button>
                            )}

                            <ActionMenu label={`${text("المزيد", "More")} ${row.invoiceNumber}`}>
                              <ActionMenuItem
                                icon={
                                  copiedNumber === row.invoiceNumber ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )
                                }
                                onClick={() => void handleCopyNumber(row.invoiceNumber)}
                              >
                                {copiedNumber === row.invoiceNumber
                                  ? text("تم نسخ الرقم", "Number copied")
                                  : text("نسخ رقم الفاتورة", "Copy invoice #")}
                              </ActionMenuItem>
                              {canAdjustRow && (
                                <>
                                  <ActionMenuItem
                                    icon={<FileMinus className="w-3.5 h-3.5" />}
                                    tone="danger"
                                    href={`/admin/invoices/new?type=TAX&kind=CREDIT&originalInvoiceId=${encodeURIComponent(row.id)}`}
                                  >
                                    {text("إصدار إشعار دائن", "Issue credit note")}
                                  </ActionMenuItem>
                                  <ActionMenuItem
                                    icon={<FilePlus className="w-3.5 h-3.5" />}
                                    tone="gold"
                                    href={`/admin/invoices/new?type=TAX&kind=DEBIT&originalInvoiceId=${encodeURIComponent(row.id)}`}
                                  >
                                    {text("إصدار إشعار مدين", "Issue debit note")}
                                  </ActionMenuItem>
                                </>
                              )}
                              {canDeleteInvoices && (
                                <>
                                  <ActionMenuSeparator />
                                  <ActionMenuItem
                                    icon={
                                      isArchived ? (
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      ) : (
                                        <Archive className="w-3.5 h-3.5" />
                                      )
                                    }
                                    tone={isArchived ? "gold" : "default"}
                                    onClick={() => setVisibilityTarget(row)}
                                  >
                                    {isArchived
                                      ? text("استعادة الفاتورة", "Restore invoice")
                                      : text("إزالة من القائمة", "Remove from list")}
                                  </ActionMenuItem>
                                </>
                              )}
                            </ActionMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-3.5 space-y-3">
              {filteredItems.map((row) => {
                const docType = row.documentType || "BOOKING";
                const isProforma = docType === "PROFORMA";
                const isCredit = row.taxDocument?.kind === "CREDIT";
                const isDebit = row.taxDocument?.kind === "DEBIT";
                const isDownloadingThis = downloadingId === row.id;
                const payMeta = row.paymentSummary
                  ? paymentStatusMeta(row.paymentSummary.status, !isRTL, "SALE")
                  : null;
                const canPayRow =
                  canWriteAccounting &&
                  !isArchived &&
                  !isProforma &&
                  !isCredit &&
                  !isDebit &&
                  (payMeta ? payMeta.canPay : true);
                const canAdjustRow = canCreateInvoices && !isArchived && canIssueTaxAdjustment(row);

                return (
                  <MobileRecordCard
                    key={row.id}
                    title={
                      <Link
                        href={`/admin/invoices/${row.id}`}
                        className="font-mono font-semibold text-sm text-[var(--accent-gold)] hover:underline"
                      >
                        <bdi dir="ltr">{row.invoiceNumber}</bdi>
                      </Link>
                    }
                    subtitle={row.customerName}
                    badge={
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Badge
                          variant={
                            isCredit
                              ? "destructive"
                              : isDebit
                                ? "warning"
                                : isProforma
                                  ? "outline"
                                  : "secondary"
                          }
                          className="text-xs"
                        >
                          {ui(
                            isCredit
                              ? "إشعار دائن"
                              : isDebit
                                ? "إشعار مدين"
                                : invoiceTitle(row),
                          )}
                        </Badge>
                        {payMeta && (
                          <Badge variant={payMeta.variant} className="text-[11px]">
                            {payMeta.label}
                          </Badge>
                        )}
                      </div>
                    }
                    footer={
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex-1 min-h-11 gap-1.5 text-xs font-bold"
                        >
                          <Link href={`/admin/invoices/${row.id}`}>
                            <Eye
                              className="w-4 h-4 text-[var(--accent-gold)]"
                              aria-hidden="true"
                            />
                            <span>{ui(t("common.view"))}</span>
                          </Link>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isDownloadingThis}
                          onClick={() => void handleDownloadPdf(row)}
                          className="flex-1 min-h-11 gap-1.5 border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] text-[var(--accent-gold)] text-xs font-bold"
                        >
                          {isDownloadingThis ? (
                            <Loader2
                              className="w-4 h-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Download className="w-4 h-4" aria-hidden="true" />
                          )}
                          <span>PDF</span>
                        </Button>

                        <ActionMenu label={`${text("المزيد", "More")} ${row.invoiceNumber}`}>
                          <ActionMenuItem
                            icon={<Copy className="w-3.5 h-3.5" />}
                            onClick={() => void handleCopyNumber(row.invoiceNumber)}
                          >
                            {text("نسخ رقم الفاتورة", "Copy invoice #")}
                          </ActionMenuItem>
                          {canAdjustRow && (
                            <>
                              <ActionMenuItem
                                icon={<FileMinus className="w-3.5 h-3.5" />}
                                tone="danger"
                                href={`/admin/invoices/new?type=TAX&kind=CREDIT&originalInvoiceId=${encodeURIComponent(row.id)}`}
                              >
                                {text("إصدار إشعار دائن", "Issue credit note")}
                              </ActionMenuItem>
                              <ActionMenuItem
                                icon={<FilePlus className="w-3.5 h-3.5" />}
                                tone="gold"
                                href={`/admin/invoices/new?type=TAX&kind=DEBIT&originalInvoiceId=${encodeURIComponent(row.id)}`}
                              >
                                {text("إصدار إشعار مدين", "Issue debit note")}
                              </ActionMenuItem>
                            </>
                          )}
                          {canDeleteInvoices && (
                            <>
                              <ActionMenuSeparator />
                              <ActionMenuItem
                                icon={isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                onClick={() => setVisibilityTarget(row)}
                              >
                                {isArchived ? text("استعادة الفاتورة", "Restore invoice") : text("إزالة من القائمة", "Remove from list")}
                              </ActionMenuItem>
                            </>
                          )}
                        </ActionMenu>

                        {canPayRow && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentModalInvoice(row)}
                            className="w-full min-h-11 gap-1.5 border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:text-emerald-300 text-xs font-bold"
                          >
                            <CreditCard
                              className="w-4 h-4 text-emerald-700 dark:text-emerald-300"
                              aria-hidden="true"
                            />
                            <span>{ui(t("invoice.recordPayment"))}</span>
                          </Button>
                        )}
                      </>
                    }
                  >
                    <MobileCardMetaGrid columns={3}>
                      <MobileCardField
                        label={ui("التاريخ")}
                        mono
                        value={
                          <bdi dir="ltr">
                            {dateLabel(row.invoiceDate, ui.language)}
                          </bdi>
                        }
                      />
                      <MobileCardField
                        label={
                          row.paymentSummary && (row.paymentSummary.status === "PARTIAL" || row.paymentSummary.status === "UNPAID")
                            ? text("المتبقي", "Due")
                            : ui(t("invoice.vat"))
                        }
                        value={
                          <Money
                            amount={
                              row.paymentSummary && (row.paymentSummary.status === "PARTIAL" || row.paymentSummary.status === "UNPAID")
                                ? row.paymentSummary.balance
                                : row.vatAmount
                            }
                            size="xs"
                            color={
                              row.paymentSummary && (row.paymentSummary.status === "PARTIAL" || row.paymentSummary.status === "UNPAID")
                                ? "amber"
                                : "muted"
                            }
                          />
                        }
                      />
                      <MobileCardField
                        label={ui(t("invoice.total"))}
                        value={
                          <Money
                            amount={row.totalAmount}
                            negative={isCredit}
                            color={isCredit ? "rose" : "default"}
                            size="sm"
                          />
                        }
                      />
                    </MobileCardMetaGrid>
                  </MobileRecordCard>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t theme-border bg-[var(--bg-card-subtle)] flex items-center justify-between gap-4 text-xs">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="min-h-11 sm:min-h-9 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] text-[var(--text-main)] font-bold disabled:opacity-40 hover:border-[var(--accent-gold)] transition cursor-pointer"
          >
            {isRTL ? (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{ui(t("common.back"))}</span>
          </button>

          <span className="font-bold text-[var(--text-muted)]">
            {ui(t("common.page"))} <span className="font-mono">{page}</span>{" "}
            {ui(t("common.of"))} <span className="font-mono">{totalPages}</span>
          </span>

          <button
            type="button"
            disabled={!data || page * 30 >= data.total}
            onClick={() => setPage(page + 1)}
            className="min-h-11 sm:min-h-9 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] text-[var(--text-main)] font-bold disabled:opacity-40 hover:border-[var(--accent-gold)] transition cursor-pointer"
          >
            <span>{ui(t("common.next"))}</span>
            {isRTL ? (
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Quick Record Payment Modal */}
      {canWriteAccounting && paymentModalInvoice && (
        <RecordPaymentModal
          isOpen={Boolean(paymentModalInvoice)}
          invoiceId={paymentModalInvoice.id}
          invoiceNumber={paymentModalInvoice.invoiceNumber}
          customerName={paymentModalInvoice.customerName}
          totalAmount={paymentModalInvoice.totalAmount}
          onClose={() => setPaymentModalInvoice(null)}
          onPaymentSuccess={() => {
            void load(true);
          }}
        />
      )}

      {/* Controlled Archive/Restore Dialog hoisted outside ActionMenu */}
      {canDeleteInvoices && visibilityTarget && (
        <InvoiceVisibilityAction
          id={visibilityTarget.id}
          number={visibilityTarget.invoiceNumber}
          isArchived={isArchived}
          hideTrigger
          open={Boolean(visibilityTarget)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setVisibilityTarget(null);
          }}
          onChanged={() => {
            setVisibilityTarget(null);
            if (filteredItems.length === 1 && page > 1) setPage((v) => v - 1);
            else void load(true);
          }}
        />
      )}
    </div>
  );
}
