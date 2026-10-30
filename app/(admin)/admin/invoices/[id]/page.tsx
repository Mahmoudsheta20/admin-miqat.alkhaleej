"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Landmark,
  Loader2,
  Plus,
  QrCode,
  ReceiptText,
  User,
  AlertCircle,
  HelpCircle,
  FileMinus,
  FilePlus,
  ShieldCheck,
  Clock,
} from "lucide-react";
import InvoiceTaxSummary from "./invoice-tax-summary";
import InvoiceQr from "./invoice-qr";
import InvoiceTransportDetails from "./transport-details";
import { BILLING_UNIT_LABELS } from "@/lib/invoice-transport";
import {
  invoiceTitle,
  dateLabel,
  downloadInvoice,
  invoiceRequest,
  type InvoiceDetail,
} from "@/lib/invoices";
import { accountingRequest } from "@/lib/accounting";
import RecordPaymentModal from "../record-payment-modal";

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

const PAYMENT_LABELS: Record<string, string> = {
  "10": "نقدًا",
  "30": "تحويل بنكي",
  "42": "حساب بنكي",
  "48": "بطاقة مصرفية",
};

function formatMoney(value: string | number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function InvoicePage({ params }: InvoicePageProps) {
  const { id } = use(params);
  const [data, setData] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live balance state
  const [balanceData, setBalanceData] = useState<{
    balance: string;
    direction: string;
  } | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const loadBalance = useCallback(async () => {
    setIsLoadingBalance(true);
    try {
      const res = await accountingRequest<{
        balance: string;
        direction: string;
      }>(`/document-balance/SALE/${encodeURIComponent(id)}`);
      if (res.data) setBalanceData(res.data);
    } catch {
      // Ignore balance fetch error silently
    } finally {
      setIsLoadingBalance(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    void invoiceRequest<InvoiceDetail>(`/${encodeURIComponent(id)}`).then(
      (result) => {
        if (!active) return;
        if (result.error) setError(result.error);
        if (result.data) setData(result.data);
      },
    );
    void accountingRequest<{ balance: string; direction: string }>(
      `/document-balance/SALE/${encodeURIComponent(id)}`,
    ).then((res) => {
      if (!active) return;
      if (res.data) setBalanceData(res.data);
    });
    return () => {
      active = false;
    };
  }, [id]);

  async function download() {
    setIsDownloading(true);
    setError("");
    try {
      await downloadInvoice(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التنزيل");
    } finally {
      setIsDownloading(false);
    }
  }

  function copyVerificationUrl() {
    if (!data?.verificationUrl) return;
    void navigator.clipboard.writeText(data.verificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  if (!data) {
    return (
      <div
        className="py-20 flex flex-col items-center justify-center gap-3 text-center"
        dir="rtl"
      >
        {error ? (
          <div className="theme-card max-w-md w-full p-6 rounded-2xl border border-rose-500/30 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p
              role="alert"
              className="text-sm font-bold text-rose-600 dark:text-rose-400"
            >
              {error}
            </p>
            <Link
              href="/admin/invoices"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gold-gradient-btn text-xs font-bold"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لسجل الفواتير</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p
              role="status"
              className="text-xs font-bold text-slate-500 dark:text-slate-400"
            >
              جارٍ تحميل الفاتورة…
            </p>
          </>
        )}
      </div>
    );
  }

  const docType = data.snapshot.input.documentType || "BOOKING";
  const isProforma = docType === "PROFORMA";
  const isCredit = data.snapshot.input.taxDocument?.kind === "CREDIT";
  const isDebit = data.snapshot.input.taxDocument?.kind === "DEBIT";
  const buyer = data.snapshot.input.buyer;
  const issuer = data.snapshot.issuer;

  // Financial calculations for paid vs remaining (§6)
  const grossNum = Number(data.snapshot.totals.gross);
  const remainingNum = balanceData
    ? Math.max(0, Number(balanceData.balance))
    : isProforma
      ? 0
      : grossNum;
  const paidNum = Math.max(0, grossNum - remainingNum);
  const isFullyPaid = !isProforma && remainingNum <= 0.005;
  const isPartiallyPaid =
    !isProforma && remainingNum > 0.005 && paidNum > 0.005;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Breadcrumb & Top Bar (§4, §6) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <Link href="/admin" className="hover:text-amber-600 transition">
              لوحة الإدارة
            </Link>
            <span>/</span>
            <Link
              href="/admin/invoices"
              className="text-amber-700 dark:text-amber-400 font-bold hover:underline"
            >
              الفواتير
            </Link>
            <span>/</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {data.invoiceNumber}
            </span>
          </div>

          <header className="flex flex-wrap items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {data.invoiceNumber}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
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
                    ? "إشعار دائن (خفض)"
                    : isDebit
                      ? "إشعار مدين (إضافة)"
                      : invoiceTitle(data.snapshot.input)}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border theme-border text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>محفوظة في النظام</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {buyer.name} · تاريخ الإصدار:{" "}
                <span className="font-mono">{dateLabel(data.invoiceDate)}</span>
              </p>
            </div>
          </header>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.contractId && (
            <Link
              href={`/admin/contracts/${encodeURIComponent(data.contractId)}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border theme-card hover:border-amber-500 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
            >
              <FileText className="w-4 h-4 text-amber-500" />
              <span>العقد المرتبط</span>
            </Link>
          )}

          <Link
            href="/admin/invoices/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border theme-card hover:border-amber-500 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
          >
            <Plus className="w-4 h-4 text-amber-500" />
            <span>فاتورة جديدة</span>
          </Link>

          {!isProforma && !isCredit && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>تسجيل دفعة</span>
            </button>
          )}

          <button
            type="button"
            disabled={isDownloading}
            onClick={() => void download()}
            className="gold-gradient-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {isDownloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            <span>تنزيل الفاتورة PDF</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Prominent Financial Status Ribbon (§6: المبلغ المدفوع والمتبقي) */}
      {!isProforma && (
        <section className="theme-card p-5 sm:p-6 rounded-2xl border theme-border shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border pb-3.5">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                حالة السداد والتحصيل
              </h2>
            </div>
            <div>
              {isLoadingBalance ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span>تحديث الرصيد…</span>
                </span>
              ) : isFullyPaid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>مدفوع بالكامل (0.00 ر.س متبقي)</span>
                </span>
              ) : isPartiallyPaid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-black">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    دفعة جزئية (متبقي {formatMoney(remainingNum)} ر.س)
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-xs font-black">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>غير مدفوع / آجل بالكامل</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border">
              <span className="text-xs text-slate-500 block">
                الإجمالي الشامل (15%)
              </span>
              <strong className="mt-1 block font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {formatMoney(grossNum)}{" "}
                <span className="text-xs text-amber-600 font-bold">ر.س</span>
              </strong>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-bold">
                المبلغ المدفوع (المحصل)
              </span>
              <strong className="mt-1 block font-mono text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                {formatMoney(paidNum)}{" "}
                <span className="text-xs font-bold">ر.س</span>
              </strong>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs text-amber-700 dark:text-amber-400 block font-bold">
                المتبقي للمتابعة
              </span>
              <strong
                className={`mt-1 block font-mono text-lg sm:text-xl font-black ${
                  isFullyPaid
                    ? "text-slate-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {formatMoney(remainingNum)}{" "}
                <span className="text-xs font-bold">ر.س</span>
              </strong>
            </div>
          </div>

          {/* Quick Actions & Note issuance bar (§7) */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {!isFullyPaid && !isCredit && (
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl gold-gradient-btn text-xs font-black shadow-xs cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>تسجيل دفعة جديدة للعميل</span>
                </button>
              )}

              {!isCredit && (
                <Link
                  href={`/admin/invoices/new?type=TAX&kind=CREDIT&originalInvoiceId=${encodeURIComponent(id)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-bold transition"
                  title="إصدار إشعار دائن لخفض قيمة الفاتورة أو إلغائها"
                >
                  <FileMinus className="w-3.5 h-3.5 text-rose-500" />
                  <span>خفض قيمة الفاتورة (إشعار دائن)</span>
                </Link>
              )}

              <Link
                href={`/admin/invoices/new?type=TAX&kind=DEBIT&originalInvoiceId=${encodeURIComponent(id)}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-bold transition"
                title="إصدار إشعار مدين لإضافة مبالغ إلى الفاتورة"
              >
                <FilePlus className="w-3.5 h-3.5 text-purple-500" />
                <span>إضافة مبلغ (إشعار مدين)</span>
              </Link>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>محمي ضد الحذف المباشر لضمان سلامة الإقرار الضريبي</span>
            </div>
          </div>
        </section>
      )}

      {/* Tax Summary if applicable */}
      <InvoiceTaxSummary invoice={data} />

      {/* Main Grid: Invoice Summary + QR Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Invoice Core Details & Financial Totals */}
        <section className="lg:col-span-8 theme-card p-5 sm:p-6 rounded-2xl border theme-border space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                <span>بيانات الفاتورة والأطراف</span>
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                {PAYMENT_LABELS[data.snapshot.input.paymentCode] ||
                  data.snapshot.input.paymentCode}
              </span>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border theme-border">
                <dt className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>الشركة المصدرة</span>
                </dt>
                <dd className="mt-1 font-black text-slate-900 dark:text-white">
                  {issuer.legalName}
                </dd>
                {issuer.vatNumber && (
                  <dd className="mt-0.5 text-[11px] font-mono text-slate-500">
                    الرقم الضريبي: {issuer.vatNumber}
                  </dd>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border theme-border">
                <dt className="text-xs text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  <span>فاتورة باسم (العميل)</span>
                </dt>
                <dd className="mt-1 font-black text-slate-900 dark:text-white">
                  {buyer.name}
                </dd>
                {buyer.vatNumber && (
                  <dd className="mt-0.5 text-[11px] font-mono text-slate-500">
                    الرقم الضريبي للعميل: {buyer.vatNumber}
                  </dd>
                )}
              </div>

              <div>
                <dt className="text-xs text-slate-500">تاريخ الفاتورة</dt>
                <dd className="mt-1 font-bold font-mono text-slate-900 dark:text-white">
                  {dateLabel(data.invoiceDate)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500">طريقة استلام المبلغ</dt>
                <dd className="mt-1 font-bold text-slate-900 dark:text-white">
                  {PAYMENT_LABELS[data.snapshot.input.paymentCode] ||
                    data.snapshot.input.paymentCode}
                </dd>
              </div>
            </dl>
          </div>

          {/* Financial Breakdown Banner */}
          <div className="pt-4 border-t theme-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border theme-border">
                <span className="text-xs text-slate-500 block">
                  قبل الضريبة
                </span>
                <strong className="mt-1 block font-mono text-base font-black text-slate-900 dark:text-white">
                  {data.snapshot.totals.net} ر.س
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border theme-border">
                <span className="text-xs text-slate-500 block">
                  ضريبة المبيعات (15%)
                </span>
                <strong className="mt-1 block font-mono text-base font-black text-amber-600 dark:text-amber-400">
                  {data.snapshot.totals.vat} ر.س
                </strong>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900 dark:bg-slate-800 px-5 py-4 text-white flex items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-300 block">
                  الإجمالي الشامل للضريبة
                </span>
                <p className="text-xl sm:text-2xl font-black mt-0.5">
                  الإجمالي:{" "}
                  <bdi className="font-mono text-amber-400">
                    {data.snapshot.totals.gross}
                  </bdi>{" "}
                  ر.س
                </p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-white/10 text-xs font-mono text-slate-200">
                SAR
              </span>
            </div>
          </div>
        </section>

        {/* Customer Verification Link & QR Card */}
        <section className="lg:col-span-4 theme-card rounded-2xl border theme-border p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 border-b theme-border pb-3">
              <QrCode className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                رابط الفاتورة للعميل
              </h2>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              امسح الرمز أو انسخ الرابط لمشاركته مع العميل لعرض الفاتورة والتحقق
              منها وتنزيل نسخة العميل الرسمية.
            </p>
          </div>

          <div className="flex justify-center py-2">
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <InvoiceQr invoiceId={id} />
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={copyVerificationUrl}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-800 dark:text-amber-300 transition cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>تم نسخ رابط العميل بنجاح!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ رابط التحقق للعميل</span>
                </>
              )}
            </button>

            <a
              href={data.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border theme-border hover:border-amber-500 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
              <span>فتح رابط الفاتورة</span>
            </a>
          </div>
        </section>
      </div>

      {/* Explanatory «ماذا يعني هذا؟» Box (§6, §7) */}
      <section className="theme-card rounded-2xl border theme-border p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b theme-border pb-3">
          <HelpCircle className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            ماذا يعني هذا؟ (شرح العمليات المالية لهذه الفاتورة)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>المبلغ المتبقي</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              يمثل الرصيد المعلق على ذمة العميل (1103) حتى يتم استلام حوالة
              بنكية أو نقدية وتسجيل سند قبض لتسوية الفاتورة.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <FileMinus className="w-3.5 h-3.5 text-rose-500" />
              <span>إشعار دائن (خفض القيمة)</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              يُستخدم عند إلغاء الرحلة أو رد جزء من المبلغ للعميل؛ لا يتم حذف
              الفاتورة الأصلية بل يصدر إشعار يخفض الإيراد والضريبة نظامياً.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <FilePlus className="w-3.5 h-3.5 text-purple-500" />
              <span>إشعار مدين (إضافة مبلغ)</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              يُستخدم عند تمديد مدة الإيجار أو إضافة خدمات ومسارات إضافية بعد
              صدور الفاتورة، فيضاف المبلغ للإقرار والذمم تلقائياً.
            </p>
          </div>
        </div>
      </section>

      {/* Transport Details */}
      {data.snapshot.input.transport && (
        <InvoiceTransportDetails value={data.snapshot.input.transport} />
      )}

      {/* Bank Details (for Proforma or when included) */}
      {data.snapshot.input.bankDetails && (
        <section className="theme-card rounded-2xl border theme-border p-5 sm:p-6">
          <h2 className="mb-4 text-base font-black text-slate-900 dark:text-white flex items-center gap-2 border-b theme-border pb-3">
            <Landmark className="w-4 h-4 text-amber-500" />
            <span>بيانات التحويل البنكي</span>
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs sm:text-sm">
            {[
              ["اسم البنك", data.snapshot.input.bankDetails.bankName],
              ["اسم الحساب", data.snapshot.input.bankDetails.accountHolder],
              ["رقم الحساب", data.snapshot.input.bankDetails.accountNumber],
              ["آيبان / IBAN", data.snapshot.input.bankDetails.iban],
              ["سويفت كود", data.snapshot.input.bankDetails.swiftCode],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div
                  key={label}
                  className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border theme-border"
                >
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd
                    dir="auto"
                    className="mt-1 break-all font-bold font-mono text-slate-900 dark:text-white"
                  >
                    {value}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      )}

      {/* Services Line Items Table */}
      <section className="theme-card rounded-2xl border theme-border overflow-hidden">
        <div className="p-4 sm:p-5 border-b theme-border flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-amber-500" />
            <span>
              بنود الخدمات والرسوم ({data.snapshot.input.lines.length})
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/50 border-b theme-border text-slate-500 dark:text-slate-400 font-bold">
                {["البيان", "الكمية", "السعر", "الخصم", "الضريبة"].map(
                  (label) => (
                    <th key={label} className="p-3.5 whitespace-nowrap">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {data.snapshot.input.lines.map((line, index) => (
                <tr
                  key={index}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition"
                >
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    {line.description}
                  </td>
                  <td className="p-3.5 whitespace-nowrap font-semibold">
                    <span className="font-mono">{line.quantity}</span>{" "}
                    {line.billingUnit
                      ? BILLING_UNIT_LABELS[line.billingUnit]
                      : ""}
                  </td>
                  <td className="p-3.5 font-mono whitespace-nowrap" dir="ltr">
                    {line.unitPrice} ر.س
                  </td>
                  <td
                    className="p-3.5 font-mono text-slate-500 whitespace-nowrap"
                    dir="ltr"
                  >
                    {line.discount} ر.س
                  </td>
                  <td className="p-3.5 font-mono whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-xs">
                      {line.rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <RecordPaymentModal
          isOpen={showPaymentModal}
          invoiceId={id}
          invoiceNumber={data.invoiceNumber}
          customerName={buyer.name}
          totalAmount={data.snapshot.totals.gross}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={() => {
            void loadBalance();
          }}
        />
      )}
    </div>
  );
}
