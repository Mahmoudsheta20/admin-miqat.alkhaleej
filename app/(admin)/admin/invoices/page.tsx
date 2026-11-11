"use client";
import { useApiQuery } from "@/lib/use-api-query";
import { useUrlState } from "@/lib/use-url-state";
import { useUiText } from "@/lib/ui-text";

import { useMemo, useState } from "react";
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
  ShieldCheck,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  invoiceTitle,
  dateLabel,
  downloadInvoice,
  type InvoiceRow,
} from "@/lib/invoices";
import InvoiceVisibilityAction from "./invoice-visibility-action";
import RecordPaymentModal from "./record-payment-modal";
import { useLanguage } from "@/lib/languageContext";
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
  const [page, setPage] = useUrlState<number>("page", 1);
  const [isArchived, setIsArchived] = useUrlState<boolean>("archived", false);

  // Client-side instant filters
  const [search, setSearch] = useUrlState<string>("q", "");
  const [typeFilter, setTypeFilter] = useUrlState<
    "ALL" | "BOOKING" | "PROFORMA" | "TAX" | "NOTES"
  >("type", "ALL", ["ALL", "BOOKING", "PROFORMA", "TAX", "NOTES"]);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState("");

  // Payment Modal State
  const [paymentModalInvoice, setPaymentModalInvoice] =
    useState<InvoiceRow | null>(null);

  const [actionError, setError] = useState("");
  const {
    data,
    error: queryError,
    isLoading,
    refetch,
  } = useApiQuery<InvoiceList>(`/invoices?page=${page}&archived=${isArchived}`);
  const error = actionError || queryError;
  const isRefreshing = isLoading;
  const load = (showRefresh = false) => {
    if (showRefresh) setError("");
    refetch();
  };

  const items = useMemo(() => data?.items ?? [], [data]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((row) => {
      const docType = row.documentType || "BOOKING";
      const isNote =
        row.taxDocument?.kind === "CREDIT" || row.taxDocument?.kind === "DEBIT";

      if (
        typeFilter === "BOOKING" &&
        (!["BOOKING", "TAX"].includes(docType) || isNote)
      )
        return false;
      if (typeFilter === "PROFORMA" && docType !== "PROFORMA") return false;
      if (typeFilter === "TAX" && (docType !== "TAX" || isNote)) return false;
      if (typeFilter === "NOTES" && !isNote) return false;

      if (!q) return true;
      return (
        row.invoiceNumber.toLowerCase().includes(q) ||
        row.customerName.toLowerCase().includes(q) ||
        row.totalAmount.includes(q)
      );
    });
  }, [items, search, typeFilter]);

  const stats = useMemo(() => {
    let bookingCount = 0;
    let proformaCount = 0;
    let taxCount = 0;
    let notesCount = 0;
    let pageGrossSum = 0;
    let pageVatSum = 0;

    for (const item of items) {
      const docType = item.documentType || "BOOKING";
      const isNote =
        item.taxDocument?.kind === "CREDIT" ||
        item.taxDocument?.kind === "DEBIT";

      if (isNote) {
        notesCount++;
      } else if (docType === "PROFORMA") {
        proformaCount++;
      } else if (docType === "TAX") {
        taxCount++;
      } else {
        bookingCount++;
      }

      if (docType === "PROFORMA") continue;
      const gross = Number(item.totalAmount);
      const vat = Number(item.vatAmount);
      if (Number.isFinite(gross)) {
        if (item.taxDocument?.kind === "CREDIT") {
          pageGrossSum -= gross;
        } else {
          pageGrossSum += gross;
        }
      }
      if (Number.isFinite(vat)) {
        if (item.taxDocument?.kind === "CREDIT") {
          pageVatSum -= vat;
        } else {
          pageVatSum += vat;
        }
      }
    }

    return {
      total: data?.total ?? items.length,
      bookingCount,
      proformaCount,
      taxCount,
      notesCount,
      pageGrossSum: pageGrossSum.toFixed(2),
      pageVatSum: pageVatSum.toFixed(2),
    };
  }, [items, data?.total]);

  const handleCopyNumber = (invoiceNumber: string) => {
    void navigator.clipboard.writeText(invoiceNumber);
    setCopiedNumber(invoiceNumber);
    setTimeout(() => {
      setCopiedNumber((curr) => (curr === invoiceNumber ? null : curr));
    }, 2000);
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
        primaryAction={{
          label: t("invoice.newInvoice"),
          href: "/admin/invoices/new",
          icon: Plus,
        }}
        secondaryActions={[
          {
            label: `+ ${t("invoice.proforma")}`,
            href: "/admin/invoices/new?type=PROFORMA",
            icon: FileSpreadsheet,
            variant: "subtle",
          },
          {
            label: t("nav.zatca"),
            href: "/admin/invoices/settings",
            icon: Building2,
          },
        ]}
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
          onClick={() => setTypeFilter("ALL")}
          isLoading={isLoading && !data}
        />
        <StatCard
          label={ui(t("invoice.customerInvoices"))}
          value={stats.bookingCount + stats.taxCount}
          subtext={t("invoice.customerInvoices")}
          icon={Check}
          variant="emerald"
          isActive={typeFilter === "BOOKING"}
          onClick={() => setTypeFilter("BOOKING")}
          isLoading={isLoading && !data}
        />
        <StatCard
          label={ui(t("invoice.proformaInvoices"))}
          value={stats.proformaCount}
          subtext={t("invoice.proforma")}
          icon={FileSpreadsheet}
          variant="blue"
          isActive={typeFilter === "PROFORMA"}
          onClick={() => setTypeFilter("PROFORMA")}
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
        onSearchChange={setSearch}
        searchPlaceholder={ui(t("invoice.searchPlaceholder"))}
        tabs={[
          { id: "ALL", label: t("common.all"), count: items.length },
          {
            id: "BOOKING",
            label: t("invoice.customerInvoices"),
            count: stats.bookingCount + stats.taxCount,
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
        onTabChange={(tabId) => setTypeFilter(tabId as typeof typeFilter)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <p className="text-xs text-[var(--text-muted)]">
          {isRTL
            ? "البحث والتصفية والإجماليات تخص الصفحة الحالية."
            : "Search, filters and sales totals apply to the current page."}
        </p>
      </div>
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
                items.length === 0
                  ? "لا توجد فواتير حتى الآن."
                  : "لا توجد فواتير مطابقة للبحث",
              )}
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {ui(
                items.length === 0
                  ? "ابدأ بإنشاء فاتورة جديدة أو فاتورة مبدئية وسيتم حفظها مع رمز الفاتورة الضريبية ZATCA QR ونسخة PDF للعميل."
                  : "جرب تعديل كلمات البحث أو تغيير تصفية نوع الفاتورة.",
              )}
            </p>
            {items.length === 0 ? (
              <Link
                href="/admin/invoices/new"
                className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-4 py-1.5 rounded-lg gold-gradient-btn text-xs font-bold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{ui(t("invoice.newInvoice"))}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("ALL");
                }}
                className="min-h-11 sm:min-h-9 px-4 py-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-xs font-bold text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition cursor-pointer"
              >
                {ui(t("common.cancel"))}
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

                    return (
                      <TableRow
                        key={row.id}
                        className="hover:bg-[var(--table-row-hover)] transition duration-150"
                      >
                        <TableCell className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/admin/invoices/${row.id}`}
                              className="text-[var(--accent-gold)] font-semibold font-mono text-sm hover:underline"
                              dir="ltr"
                            >
                              {row.invoiceNumber}
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyNumber(row.invoiceNumber)
                              }
                              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:bg-[var(--accent-surface)] transition cursor-pointer"
                              aria-label={`${ui("نسخ رقم الفاتورة")} ${row.invoiceNumber}`}
                              title={ui("نسخ رقم الفاتورة")}
                            >
                              {copiedNumber === row.invoiceNumber ? (
                                <Check
                                  className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Copy
                                  className="w-3.5 h-3.5"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          </div>
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
                                      : "bg-emerald-500/12 text-emerald-800 border-emerald-600/35 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35"
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
                            <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                              <ShieldCheck
                                className="w-3 h-3 text-[var(--accent-gold)]"
                                aria-hidden="true"
                              />
                              <span>{ui("محفوظة في النظام")}</span>
                            </span>
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
                              className="inline-flex min-h-8 items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] text-[var(--text-main)] text-xs font-bold transition"
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
                              className="inline-flex min-h-8 items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] hover:border-[var(--accent-gold)] text-[var(--accent-gold)] text-xs font-bold transition disabled:opacity-50 cursor-pointer"
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

                            {!isArchived && !isProforma && !isCredit && (
                              <button
                                type="button"
                                onClick={() => setPaymentModalInvoice(row)}
                                className="inline-flex min-h-8 items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-600/35 bg-emerald-500/12 hover:border-emerald-600 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:hover:border-emerald-500 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
                                title={ui(t("invoice.recordPayment"))}
                              >
                                <CreditCard
                                  className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300"
                                  aria-hidden="true"
                                />
                                <span>{ui(t("invoice.recordPayment"))}</span>
                              </button>
                            )}
                            <InvoiceVisibilityAction
                              id={row.id}
                              number={row.invoiceNumber}
                              isArchived={isArchived}
                              onChanged={() => {
                                if (filteredItems.length === 1 && page > 1)
                                  setPage((v) => v - 1);
                                else void load(true);
                              }}
                            />
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

                return (
                  <MobileRecordCard
                    key={row.id}
                    title={
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/invoices/${row.id}`}
                          className="font-mono font-semibold text-sm text-[var(--accent-gold)] hover:underline"
                        >
                          <bdi dir="ltr">{row.invoiceNumber}</bdi>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCopyNumber(row.invoiceNumber)}
                          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-gold)] cursor-pointer"
                          aria-label={`${ui("نسخ رقم الفاتورة")} ${row.invoiceNumber}`}
                        >
                          {copiedNumber === row.invoiceNumber ? (
                            <Check
                              className="w-4 h-4 text-emerald-700 dark:text-emerald-300"
                              aria-hidden="true"
                            />
                          ) : (
                            <Copy className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    }
                    subtitle={row.customerName}
                    badge={
                      <Badge
                        variant={
                          isCredit
                            ? "destructive"
                            : isDebit
                              ? "warning"
                              : isProforma
                                ? "outline"
                                : "success"
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

                        {!isArchived && !isProforma && !isCredit && (
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

                        <div className="w-full flex justify-end">
                          <InvoiceVisibilityAction
                            id={row.id}
                            number={row.invoiceNumber}
                            isArchived={isArchived}
                            onChanged={() => {
                              if (filteredItems.length === 1 && page > 1)
                                setPage((v) => v - 1);
                              else void load(true);
                            }}
                          />
                        </div>
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
                        label={ui(t("invoice.vat"))}
                        value={
                          <Money
                            amount={row.vatAmount}
                            size="xs"
                            color="muted"
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
      {paymentModalInvoice && (
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
    </div>
  );
}
