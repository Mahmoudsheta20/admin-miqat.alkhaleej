"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ReceiptText,
  Plus,
  Search,
  RefreshCw,
  Building2,
  FileSpreadsheet,
  Download,
  Eye,
  Copy,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Calendar,
  TrendingUp,
} from "lucide-react";
import {
  invoiceTitle,
  dateLabel,
  downloadInvoice,
  invoiceRequest,
  type InvoiceDocumentType,
  type InvoiceRow,
} from "@/lib/invoices";

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
  const [data, setData] = useState<InvoiceList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  // Client-side instant filters for current page
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | InvoiceDocumentType>("ALL");
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
    [page]
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
      if (typeFilter !== "ALL" && docType !== typeFilter) return false;
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
    let pageGrossSum = 0;
    let pageVatSum = 0;

    for (const item of items) {
      if ((item.documentType || "BOOKING") === "PROFORMA") {
        proformaCount++;
      } else {
        bookingCount++;
      }
      const gross = Number(item.totalAmount);
      const vat = Number(item.vatAmount);
      if (Number.isFinite(gross)) pageGrossSum += gross;
      if (Number.isFinite(vat)) pageVatSum += vat;
    }

    return {
      total: data?.total ?? items.length,
      bookingCount,
      proformaCount,
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
      setError(e instanceof Error ? e.message : "تعذر تنزيل الفاتورة؛ حاول مرة أخرى");
    } finally {
      setDownloadingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / 30));

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                الفوترة والمالية
              </span>
              <span className="text-xs text-slate-400 font-medium">
                ضريبة القيمة المضافة والرحلات
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              سجل الفواتير الرسمية
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              إدارة فواتير الحجوزات، الفواتير المبدئية (Proforma)، وروابط التحقق للعملاء
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={isLoading || isRefreshing}
            className="p-2.5 rounded-xl border theme-card hover:border-amber-500 text-slate-600 dark:text-slate-300 transition disabled:opacity-50 cursor-pointer"
            title="تحديث الفواتير"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing || isLoading ? "animate-spin text-amber-500" : ""}`}
            />
          </button>

          <Link
            href="/admin/invoices/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border theme-card hover:border-amber-500 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs"
          >
            <Building2 className="w-4 h-4 text-amber-500" />
            <span>بيانات الشركة والبنك</span>
          </Link>

          <Link
            href="/admin/invoices/new?type=PROFORMA"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-800 dark:text-amber-300 transition shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>+ فاتورة مبدئية</span>
          </Link>

          <Link
            href="/admin/invoices/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl gold-gradient-btn text-xs font-black shadow-sm hover:shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء فاتورة حجز</span>
          </Link>
        </div>
      </header>

      {/* Error Alert */}
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
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Interactive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setTypeFilter("ALL")}
          className={`text-right p-4 sm:p-5 rounded-2xl border transition cursor-pointer ${
            typeFilter === "ALL"
              ? "bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/30"
              : "theme-card theme-border hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              إجمالي الفواتير
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-2">
            {isLoading && !data ? "—" : stats.total}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">فاتورة مسجلة بالنظام</p>
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter("BOOKING")}
          className={`text-right p-4 sm:p-5 rounded-2xl border transition cursor-pointer ${
            typeFilter === "BOOKING"
              ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
              : "theme-card theme-border hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              فواتير الحجوزات
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {isLoading && !data ? "—" : stats.bookingCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">ضمن الصفحة الحالية</p>
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter("PROFORMA")}
          className={`text-right p-4 sm:p-5 rounded-2xl border transition cursor-pointer ${
            typeFilter === "PROFORMA"
              ? "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30"
              : "theme-card theme-border hover:border-blue-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
              الفواتير المبدئية
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-blue-600 dark:text-blue-400 mt-2">
            {isLoading && !data ? "—" : stats.proformaCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">عروض أسعار وفواتير مبدئية</p>
        </button>

        <div className="theme-card p-4 sm:p-5 rounded-2xl border theme-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              إجمالي الصفحة (شامل الضريبة)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-2 flex items-baseline gap-1">
            <span dir="ltr">{isLoading && !data ? "—" : formatMoney(stats.pageGrossSum)}</span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">ر.س</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            الضريبة: <span dir="ltr">{formatMoney(stats.pageVatSum)}</span> ر.س
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="theme-card p-3 sm:p-4 rounded-2xl border theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث سريع برقم الفاتورة، اسم العميل، أو القيمة..."
            className="theme-input w-full pr-10 pl-8 py-2 text-xs sm:text-sm rounded-xl"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              aria-label="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "ALL", label: `الكل (${items.length})` },
              { id: "BOOKING", label: `فاتورة حجز (${stats.bookingCount})` },
              { id: "PROFORMA", label: `فاتورة مبدئية (${stats.proformaCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                typeFilter === tab.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "border theme-border text-slate-600 dark:text-slate-400 hover:border-amber-500/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List Container */}
      <div className="theme-card rounded-2xl sm:rounded-3xl border theme-border overflow-hidden shadow-xs">
        <div className="px-4 sm:px-5 py-3.5 border-b theme-border bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            قائمة الفواتير ({filteredItems.length} من {data?.total || 0} فاتورة)
          </span>
          <span className="text-slate-400 font-mono">صفحة {page} من {totalPages}</span>
        </div>

        {!data && !error ? (
          <div role="status" className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              جارٍ تحميل الفواتير…
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <ReceiptText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {items.length === 0 ? "لا توجد فواتير حتى الآن." : "لا توجد فواتير مطابقة للبحث"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {items.length === 0
                ? "ابدأ بإنشاء فاتورة حجز جديدة أو فاتورة مبدئية وسيتم حفظها مع رمز QR ونسخة PDF للعميل."
                : "جرب تعديل كلمات البحث أو تغيير تصفية نوع الفاتورة."}
            </p>
            {items.length === 0 ? (
              <Link
                href="/admin/invoices/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gold-gradient-btn text-xs font-bold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء أول فاتورة</span>
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
                مسح عوامل التصفية
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="border-b theme-border bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
                    <th className="py-3.5 px-4">رقم الفاتورة</th>
                    <th className="py-3.5 px-4">النوع</th>
                    <th className="py-3.5 px-4">العميل</th>
                    <th className="py-3.5 px-4">قبل الضريبة</th>
                    <th className="py-3.5 px-4">الضريبة</th>
                    <th className="py-3.5 px-4">الإجمالي</th>
                    <th className="py-3.5 px-4">تاريخ الفاتورة</th>
                    <th className="py-3.5 px-4 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {filteredItems.map((row) => {
                    const docType = row.documentType || "BOOKING";
                    const isProforma = docType === "PROFORMA";
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
                              onClick={() => handleCopyNumber(row.invoiceNumber)}
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
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isProforma
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {invoiceTitle(row)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 border theme-border text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {row.customerName ? row.customerName.trim().charAt(0) : "ع"}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                              {row.customerName}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap" dir="ltr">
                          {formatMoney(row.netAmount)}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap" dir="ltr">
                          {formatMoney(row.vatAmount)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-black text-slate-900 dark:text-white text-sm" dir="ltr">
                            {formatMoney(row.totalAmount)}
                          </span>{" "}
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                            ر.س
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {dateLabel(row.invoiceDate)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-left">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/admin/invoices/${row.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-200 font-bold transition"
                              title="عرض تفاصيل الفاتورة ورمز QR"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-500" />
                              <span>التفاصيل</span>
                            </Link>

                            <button
                              type="button"
                              disabled={isDownloadingThis}
                              onClick={() => void handleDownloadPdf(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold transition disabled:opacity-50 cursor-pointer"
                              title="تنزيل نسخة PDF للعميل"
                            >
                              {isDownloadingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span>PDF</span>
                            </button>
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
                          isProforma
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {invoiceTitle(row)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block">العميل:</span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-white">
                          {row.customerName}
                        </strong>
                      </div>
                      <div className="text-left">
                        <span className="text-[11px] text-slate-400 block">الإجمالي الشامل:</span>
                        <strong className="font-mono text-sm font-black text-slate-900 dark:text-white" dir="ltr">
                          {formatMoney(row.totalAmount)} ر.س
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        {dateLabel(row.invoiceDate)}
                      </span>
                      <span className="font-mono">الضريبة: {formatMoney(row.vatAmount)} ر.س</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href={`/admin/invoices/${row.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border theme-card text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <Eye className="w-4 h-4 text-amber-500" />
                        <span>عرض الفاتورة</span>
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
                        <span>تنزيل PDF</span>
                      </button>
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
            <ChevronRight className="w-4 h-4" />
            <span>السابق</span>
          </button>

          <span className="font-bold text-slate-600 dark:text-slate-300">
            صفحة <span className="font-mono">{page}</span> من <span className="font-mono">{totalPages}</span>
          </span>

          <button
            type="button"
            disabled={!data || page * 30 >= data.total}
            onClick={() => setPage(page + 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card font-bold disabled:opacity-40 hover:border-amber-500 transition cursor-pointer"
          >
            <span>التالي</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
