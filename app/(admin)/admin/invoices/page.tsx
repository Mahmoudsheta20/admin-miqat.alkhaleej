"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Calendar,
  CreditCard,
  TrendingUp,
  FileMinus,
  FilePlus,
  ShieldCheck,
} from "lucide-react";
import {
  invoiceTitle,
  dateLabel,
  downloadInvoice,
  invoiceRequest,
  type InvoiceRow,
} from "@/lib/invoices";
import RecordPaymentModal from "./record-payment-modal";
import { useLanguage } from "@/lib/languageContext";
import { PageHeader, StatCard, StatRow, FilterBar, Money } from "@/app/_components/ui";

interface InvoiceList {
  items: InvoiceRow[];
  total: number;
  page: number;
}

function formatMoney(value: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function InvoicesPage() {
  const { t, dir, isRTL } = useLanguage();
  const [data, setData] = useState<InvoiceList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  // Client-side instant filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "ALL" | "BOOKING" | "PROFORMA" | "TAX" | "NOTES"
  >("ALL");
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState("");

  // Payment Modal State
  const [paymentModalInvoice, setPaymentModalInvoice] =
    useState<InvoiceRow | null>(null);

  const load = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      try {
        const result = await invoiceRequest<InvoiceList>(`?page=${page}`);
        setError(result.error || "");
        if (result.data) setData(result.data);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page],
  );

  useEffect(() => {
    let active = true;
    void invoiceRequest<InvoiceList>(`?page=${page}`).then((result) => {
      if (!active) return;
      setError(result.error || "");
      if (result.data) setData(result.data);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [page]);

  const items = useMemo(() => data?.items ?? [], [data]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((row) => {
      const docType = row.documentType || "BOOKING";
      const isNote =
        row.taxDocument?.kind === "CREDIT" || row.taxDocument?.kind === "DEBIT";

      if (typeFilter === "BOOKING" && (docType !== "BOOKING" || isNote))
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

  const invoiceHelpGuide = useMemo(() => ({
    title: isRTL ? "دليل الفواتير والمستندات المالية" : "Invoicing & Financial Documents Guide",
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
        title: isRTL ? "٣. الحماية ومشاركة الفاتورة" : "3. Protection & Sharing",
        badge: isRTL ? "محفوظة في النظام" : "System Protected",
        items: [
          {
            label: isRTL ? "عدم القابلية للتعديل المباشر" : "Immutable Document",
            description: isRTL
              ? "الفاتورة المصدرة مستند مالي ثابت؛ أي تعديل يتم بمسار نظامي عبر إصدار إشعار دائن أو مدين."
              : "Issued invoice is fixed; adjustments must follow official paths via credit or debit notes.",
          },
          {
            label: isRTL ? "نسخة العميل ورابط التحقق" : "Customer Copy & Verification",
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
  }), [isRTL]);

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      {/* 1. Unified Page Header */}
      <PageHeader
        icon={ReceiptText}
        badge={t("section.financeDaily")}
        title={t("invoice.title")}
        subtitle={t("invoice.subtitle")}
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
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400"
        >
          {seedMessage}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shrink-0 cursor-pointer"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {/* 3. Streamlined KPI Cards */}
      <StatRow>
        <StatCard
          label={t("invoice.totalInvoices")}
          value={stats.total}
          subtext={t("invoice.savedInSystem")}
          icon={ReceiptText}
          isActive={typeFilter === "ALL"}
          onClick={() => setTypeFilter("ALL")}
          isLoading={isLoading && !data}
        />
        <StatCard
          label={t("invoice.customerInvoices")}
          value={stats.bookingCount}
          subtext={t("invoice.customerInvoices")}
          icon={Check}
          variant="emerald"
          isActive={typeFilter === "BOOKING"}
          onClick={() => setTypeFilter("BOOKING")}
          isLoading={isLoading && !data}
        />
        <StatCard
          label={t("invoice.proformaInvoices")}
          value={stats.proformaCount}
          subtext={t("invoice.proforma")}
          icon={FileSpreadsheet}
          variant="blue"
          isActive={typeFilter === "PROFORMA"}
          onClick={() => setTypeFilter("PROFORMA")}
          isLoading={isLoading && !data}
        />
        <StatCard
          label={t("invoice.netSales")}
          value={formatMoney(stats.pageGrossSum)}
          unit={t("common.sar")}
          subtext={`${t("invoice.salesTax")}: ${formatMoney(stats.pageVatSum)} ${t("common.sar")}`}
          icon={TrendingUp}
          variant="amber"
          isLoading={isLoading && !data}
        />
      </StatRow>

      {/* 4. Unified Filter Bar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("invoice.searchPlaceholder")}
        tabs={[
          { id: "ALL", label: t("common.all"), count: items.length },
          { id: "BOOKING", label: t("invoice.customerInvoices"), count: stats.bookingCount },
          { id: "PROFORMA", label: t("invoice.proformaInvoices"), count: stats.proformaCount },
          { id: "NOTES", label: t("invoice.notesCount"), count: stats.notesCount },
        ]}
        activeTab={typeFilter}
        onTabChange={(tabId) => setTypeFilter(tabId as typeof typeFilter)}
      />

      {/* Invoices List Container */}
      <div className="theme-card rounded-2xl sm:rounded-3xl border theme-border overflow-hidden shadow-xs">
        <div className="px-4 sm:px-5 py-3.5 border-b theme-border bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {t("invoice.title")} ({filteredItems.length} {t("common.of")}{" "}
            {data?.total || 0})
          </span>
          <span className="text-slate-400 font-mono">
            {t("common.page")} {page} {t("common.of")} {totalPages}
          </span>
        </div>

        {!data && !error ? (
          <div
            role="status"
            className="p-12 flex flex-col items-center justify-center gap-3"
          >
            <div className="w-9 h-9 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("common.loading")}
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <ReceiptText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {items.length === 0
                ? "لا توجد فواتير حتى الآن."
                : "لا توجد فواتير مطابقة للبحث"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {items.length === 0
                ? "ابدأ بإنشاء فاتورة جديدة أو فاتورة مبدئية وسيتم حفظها مع رمز الفاتورة الضريبية ZATCA QR ونسخة PDF للعميل."
                : "جرب تعديل كلمات البحث أو تغيير تصفية نوع الفاتورة."}
            </p>
            {items.length === 0 ? (
              <Link
                href="/admin/invoices/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gold-gradient-btn text-xs font-bold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t("invoice.newInvoice")}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("ALL");
                }}
                className="px-4 py-2 rounded-xl border theme-border text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition"
              >
                {t("common.cancel")}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table
                className={`w-full ${isRTL ? "text-right" : "text-left"} text-xs border-collapse`}
              >
                <thead>
                  <tr className="border-b theme-border bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
                    <th className="py-3.5 px-4">{t("invoice.number")}</th>
                    <th className="py-3.5 px-4">
                      {t("invoice.typeAndStatus")}
                    </th>
                    <th className="py-3.5 px-4">{t("invoice.customer")}</th>
                    <th className="py-3.5 px-4">{t("invoice.subtotal")}</th>
                    <th className="py-3.5 px-4">{t("invoice.vat")}</th>
                    <th className="py-3.5 px-4">{t("invoice.total")}</th>
                    <th className="py-3.5 px-4">{t("invoice.date")}</th>
                    <th
                      className={`py-3.5 px-4 ${isRTL ? "text-left" : "text-right"}`}
                    >
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {filteredItems.map((row) => {
                    const docType = row.documentType || "BOOKING";
                    const isProforma = docType === "PROFORMA";
                    const isCredit = row.taxDocument?.kind === "CREDIT";
                    const isDebit = row.taxDocument?.kind === "DEBIT";
                    const isDownloadingThis = downloadingId === row.id;

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition duration-150"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/admin/invoices/${row.id}`}
                              className="text-amber-700 dark:text-amber-400 font-black font-mono text-sm hover:underline"
                            >
                              {row.invoiceNumber}
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyNumber(row.invoiceNumber)
                              }
                              className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-500/10 transition cursor-pointer"
                              title="نسخ رقم الفاتورة"
                            >
                              {copiedNumber === row.invoiceNumber ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                isCredit
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                  : isDebit
                                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
                                    : isProforma
                                      ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {isCredit ? (
                                <>
                                  <FileMinus className="w-3 h-3" />
                                  <span>إشعار دائن (خفض)</span>
                                </>
                              ) : isDebit ? (
                                <>
                                  <FilePlus className="w-3 h-3" />
                                  <span>إشعار مدين (إضافة)</span>
                                </>
                              ) : (
                                invoiceTitle(row)
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              <span>محفوظة في النظام</span>
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 border theme-border text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {row.customerName
                                ? row.customerName.trim().charAt(0)
                                : "ع"}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                              {row.customerName}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Money amount={row.netAmount} color="muted" size="xs" />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Money amount={row.vatAmount} color="muted" size="xs" />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Money
                            amount={isCredit ? -Math.abs(Number(row.totalAmount)) : row.totalAmount}
                            color={isCredit ? "rose" : "default"}
                            size="sm"
                          />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {dateLabel(row.invoiceDate)}
                        </td>

                        <td
                          className={`py-3.5 px-4 whitespace-nowrap ${isRTL ? "text-left" : "text-right"}`}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/admin/invoices/${row.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-200 font-bold transition"
                              title={t("common.view")}
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-500" />
                              <span>{t("common.view")}</span>
                            </Link>

                            <button
                              type="button"
                              disabled={isDownloadingThis}
                              onClick={() => void handleDownloadPdf(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold transition disabled:opacity-50 cursor-pointer"
                              title={t("common.downloadPdf")}
                            >
                              {isDownloadingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span>PDF</span>
                            </button>

                            {!isProforma && !isCredit && (
                              <button
                                type="button"
                                onClick={() => setPaymentModalInvoice(row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border theme-card hover:border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold transition cursor-pointer"
                                title={t("invoice.recordPayment")}
                              >
                                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{t("invoice.recordPayment")}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y theme-border">
              {filteredItems.map((row) => {
                const docType = row.documentType || "BOOKING";
                const isProforma = docType === "PROFORMA";
                const isCredit = row.taxDocument?.kind === "CREDIT";
                const isDebit = row.taxDocument?.kind === "DEBIT";
                const isDownloadingThis = downloadingId === row.id;

                return (
                  <div key={row.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/invoices/${row.id}`}
                          className="font-mono font-black text-sm text-amber-700 dark:text-amber-400"
                        >
                          {row.invoiceNumber}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCopyNumber(row.invoiceNumber)}
                          className="p-1 rounded-md text-slate-400 hover:text-amber-600"
                          aria-label="نسخ رقم الفاتورة"
                        >
                          {copiedNumber === row.invoiceNumber ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          isCredit
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                            : isDebit
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
                              : isProforma
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {isCredit
                          ? "إشعار دائن"
                          : isDebit
                            ? "إشعار مدين"
                            : invoiceTitle(row)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block">
                          {t("invoice.customer")}:
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-white">
                          {row.customerName}
                        </strong>
                      </div>
                      <div className="text-left">
                        <span className="text-[11px] text-slate-400 block">
                          {t("invoice.total")}:
                        </span>
                        <Money
                          amount={isCredit ? -Math.abs(Number(row.totalAmount)) : row.totalAmount}
                          color={isCredit ? "rose" : "default"}
                          size="sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        {dateLabel(row.invoiceDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>{t("invoice.vat")}:</span>
                        <Money amount={row.vatAmount} size="xs" color="muted" />
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Link
                        href={`/admin/invoices/${row.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border theme-card text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <Eye className="w-4 h-4 text-amber-500" />
                        <span>{t("common.view")}</span>
                      </Link>

                      <button
                        type="button"
                        disabled={isDownloadingThis}
                        onClick={() => void handleDownloadPdf(row)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold disabled:opacity-50"
                      >
                        {isDownloadingThis ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>PDF</span>
                      </button>

                      {!isProforma && !isCredit && (
                        <button
                          type="button"
                          onClick={() => setPaymentModalInvoice(row)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border theme-card hover:border-emerald-500 text-emerald-700 dark:text-emerald-400 text-xs font-bold cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-emerald-500" />
                          <span>{t("invoice.recordPayment")}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t theme-border bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-4 text-xs">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card font-bold disabled:opacity-40 hover:border-amber-500 transition cursor-pointer"
          >
            {isRTL ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
            <span>{t("common.back")}</span>
          </button>

          <span className="font-bold text-slate-600 dark:text-slate-300">
            {t("common.page")} <span className="font-mono">{page}</span>{" "}
            {t("common.of")} <span className="font-mono">{totalPages}</span>
          </span>

          <button
            type="button"
            disabled={!data || page * 30 >= data.total}
            onClick={() => setPage(page + 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card font-bold disabled:opacity-40 hover:border-amber-500 transition cursor-pointer"
          >
            <span>{t("common.next")}</span>
            {isRTL ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
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
