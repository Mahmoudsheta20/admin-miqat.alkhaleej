"use client";
import { useUiText } from "@/lib/ui-text";


import { use, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import InvoiceVisibilityAction from "../invoice-visibility-action";
import { ArrowRight, Building2, Check, CheckCircle2, Copy, CreditCard, Download, ExternalLink, FileText, Landmark, Loader2, Plus, QrCode, ReceiptText, User, AlertCircle, HelpCircle, FileMinus, FilePlus, ShieldCheck, Clock, MessageSquare } from "lucide-react";
import SendWhatsAppModal from "@/app/_components/SendWhatsAppModal";
import { MobileCardField, MobileCardMetaGrid, MobileRecordCard } from "@/app/_components/mobile";
import { formatMoneyValue } from "@/app/_components/ui/Money";
import InvoiceTaxSummary from "./invoice-tax-summary";
import InvoiceQr from "./invoice-qr";
import InvoiceTransportDetails from "./transport-details";
import { BILLING_UNIT_LABELS } from "@/lib/invoice-transport";
import { invoiceTitle, dateLabel, downloadInvoice, invoiceRequest, type InvoiceDetail } from "@/lib/invoices";
import { accountingRequest } from "@/lib/accounting";
import { signedMoneyMinor } from "@/lib/dashboard-analytics";
import { moneyDecimal } from "@/lib/money";
import RecordPaymentModal from "../record-payment-modal";
import { useAuth } from "@/lib/authContext";
import { hasClientPermission } from "@/lib/permissions";

const subscribeSearch = (onStoreChange: () => void) => {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
};

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

const PAYMENT_LABELS: Record<string, string> = {
  "10": "نقدًا",
  "30": "تحويل بنكي",
  "42": "حساب بنكي",
  "48": "بطاقة مصرفية",
};

export default function InvoicePage({ params }: InvoicePageProps) {
  const ui = useUiText();
  const { user: authUser } = useAuth();
  const canCreateInvoices = hasClientPermission(authUser, "invoices", "write");
  const canDeleteInvoices = hasClientPermission(authUser, "invoices", "delete");
  const canWriteAccounting = hasClientPermission(authUser, "accounting", "write");
  const canSendInvoiceWhatsApp =
    hasClientPermission(authUser, "whatsapp", "write") || canCreateInvoices;

  const { id } = use(params);
  const [data, setData] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live balance state
  const [balanceData, setBalanceData] = useState<{ balance: string; direction: string; netDocumentAmount?:string; settledAmount?:string } | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [waAutoDismissed, setWaAutoDismissed] = useState(false);
  const searchSnapshot = useSyncExternalStore(
    subscribeSearch,
    () => window.location.search,
    () => "",
  );
  const waAutoNotice = (() => {
    if (waAutoDismissed || !searchSnapshot) return null;
    const sp = new URLSearchParams(searchSnapshot);
    const status = sp.get("waAuto");
    if (status !== "sent" && status !== "error") return null;
    return {
      status,
      phone: sp.get("waPhone") || undefined,
      message: sp.get("waMsg") || undefined,
      adminPhone: sp.get("waAdmin") || undefined,
    } as const;
  })();

  const loadBalance = useCallback(async () => {
    setIsLoadingBalance(true);
    try {
      const res = await accountingRequest<{ balance: string; direction: string; netDocumentAmount?:string; settledAmount?:string }>(
        `/document-balance/SALE/${encodeURIComponent(id)}`
      );
      if (res.data) setBalanceData(res.data);
    } catch {
      // Ignore balance fetch error silently
    } finally {
      setIsLoadingBalance(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    void invoiceRequest<InvoiceDetail>(`/${encodeURIComponent(id)}`).then((result) => {
      if (!active) return;
      if (result.error) setError(result.error);
      if (result.data) setData(result.data);
    });
    void accountingRequest<{ balance: string; direction: string; netDocumentAmount?:string; settledAmount?:string }>(
      `/document-balance/SALE/${encodeURIComponent(id)}`
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

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  function copyVerificationUrl() {
    if (!data?.verificationUrl) return;
    void navigator.clipboard.writeText(data.verificationUrl);
    setCopiedLink(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedLink(false), 2500);
  }

  if (!data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-center" dir={ui.dir}>
        {error ? (
          <div className="theme-card max-w-md w-full p-6 rounded-2xl border border-rose-500/30 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" aria-hidden="true" />
            </div>
            <p role="alert" className="text-sm font-bold text-rose-700 dark:text-rose-400">
              {ui(error)}
            </p>
            <Link
              href="/admin/invoices"
              className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 px-4 py-1.5 rounded-lg gold-gradient-btn text-xs sm:text-sm font-bold"
            >
              <ArrowRight className="w-4 h-4 ltr:rotate-180" aria-hidden="true" />
              <span>{ui("العودة لسجل الفواتير")}</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 border-3 border-[var(--accent-gold)]/25 border-t-[var(--accent-gold)] rounded-full animate-spin" />
            <p role="status" className="text-xs font-bold text-[var(--text-muted)]">
              {ui("جارٍ تحميل الفاتورة…")}</p>
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

  // Exact minor-unit financial calculations for paid vs remaining
  const rawBalanceMinor = balanceData ? signedMoneyMinor(balanceData.balance) : BigInt(0);
  const absRemainingMinor = rawBalanceMinor < BigInt(0) ? -rawBalanceMinor : rawBalanceMinor;
  const remainingText = moneyDecimal(absRemainingMinor);
  const isRefundDue = Boolean(balanceData && rawBalanceMinor < BigInt(0));
  const paidMinor = balanceData?.settledAmount !== undefined ? signedMoneyMinor(balanceData.settledAmount) : BigInt(0);
  const paidText = moneyDecimal(paidMinor < BigInt(0) ? -paidMinor : paidMinor);
  const isFullyPaid = Boolean(balanceData) && !isProforma && absRemainingMinor === BigInt(0);
  const isPartiallyPaid =
    Boolean(balanceData) && !isRefundDue && !isProforma && absRemainingMinor > BigInt(0) && paidMinor > BigInt(0);

  return (
    <div className="space-y-6 pb-12" dir={ui.dir}>
      {/* Breadcrumb & Top Bar (§4, §6) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1.5">
            <Link href="/admin" className="hover:text-[var(--accent-gold)] transition">
              {ui("لوحة الإدارة")}</Link>
            <span>/</span>
            <Link href="/admin/invoices" className="text-[var(--accent-gold)] font-bold hover:underline">
              {ui("الفواتير")}</Link>
            <span>/</span>
            <span className="font-mono font-bold text-[var(--text-main)]" dir="ltr">
              {data.invoiceNumber}
            </span>
          </div>

          <header className="flex flex-wrap items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 flex items-center justify-center text-[var(--accent-gold)] shrink-0">
              <ReceiptText className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-semibold font-mono text-[var(--text-main)]" dir="ltr">
                  {data.invoiceNumber}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isCredit
                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                      : isDebit
                        ? "bg-[var(--accent-surface)] text-[var(--accent-gold)] border-[var(--accent-gold)]/35"
                        : isProforma
                          ? "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-600/25"
                          : "bg-emerald-500/12 text-emerald-800 border-emerald-600/35 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35"
                  }`}
                >
                  {ui(isCredit ? "إشعار دائن (خفض)" : isDebit ? "إشعار مدين (إضافة)" : invoiceTitle(data.snapshot.input))}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--bg-card-subtle)] text-[var(--text-main)] border theme-border text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                  <span>{ui("محفوظة في النظام")}</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                {buyer.name} {ui("· تاريخ الإصدار:")}{" "}
                <span className="font-mono" dir="ltr">{dateLabel(data.invoiceDate, ui.language)}</span>
              </p>
            </div>
          </header>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.contractId && (
            <Link
              href={`/admin/contracts/${encodeURIComponent(data.contractId)}`}
              className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] text-xs font-bold text-[var(--text-main)] transition"
            >
              <FileText className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("العقد المرتبط")}</span>
            </Link>
          )}

          {canCreateInvoices && (
            <Link
              href="/admin/invoices/new"
              className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] text-xs font-bold text-[var(--text-main)] transition"
            >
              <Plus className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("فاتورة جديدة")}</span>
            </Link>
          )}

          {canWriteAccounting && !data.visibility?.isArchived && !isProforma && !isCredit && balanceData && !isLoadingBalance && !isRefundDue && !isFullyPaid && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)] hover:border-[var(--accent-gold)] text-[var(--accent-gold)] text-xs font-bold transition cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("تسجيل دفعة")}</span>
            </button>
          )}

          {canDeleteInvoices && (
            <InvoiceVisibilityAction id={data.id} number={data.invoiceNumber} isArchived={data.visibility?.isArchived} onChanged={()=>void invoiceRequest<InvoiceDetail>(`/${encodeURIComponent(id)}`).then(result=>{if(result.data)setData(result.data);})}/>
          )}
          {canSendInvoiceWhatsApp && (
            <button
              type="button"
              onClick={() => setShowWhatsAppModal(true)}
              className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-600/35 bg-emerald-500/12 hover:border-emerald-600 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:hover:border-emerald-500 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
              title={ui("إرسال الفاتورة للعميل عبر واتساب")}
            >
              <MessageSquare className="w-4 h-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
              <span>{ui("إرسال عبر واتساب")}</span>
            </button>
          )}
          <button
            type="button"
            disabled={isDownloading}
            onClick={() => void download()}
            className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {isDownloading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            <span>{ui("تنزيل الفاتورة PDF")}</span>
          </button>
        </div>
      </div>

      {waAutoNotice && (
        <div
          role="status"
          className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2 ${
            waAutoNotice.status === "sent"
              ? "border-emerald-600/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-300"
          }`}
        >
          <div className="flex items-start gap-2">
            {waAutoNotice.status === "sent" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="space-y-0.5">
              <p className="font-bold">
                {waAutoNotice.status === "sent"
                  ? ui.language === "ar"
                    ? `تم إرسال الفاتورة تلقائياً عبر واتساب${waAutoNotice.phone ? ` إلى ${waAutoNotice.phone}` : ""}`
                    : `Invoice auto-sent via WhatsApp${waAutoNotice.phone ? ` to ${waAutoNotice.phone}` : ""}`
                  : ui.language === "ar"
                    ? `تم إصدار الفاتورة، لكن تعذّر الإرسال التلقائي عبر واتساب: ${waAutoNotice.message || ""}`
                    : `Invoice issued, but WhatsApp auto-send failed: ${waAutoNotice.message || ""}`}
              </p>
              {waAutoNotice.status === "sent" && waAutoNotice.adminPhone && (
                <p className="text-xs opacity-90">
                  {ui.language === "ar"
                    ? `تمت جدولة إشعار الإدارة (${waAutoNotice.adminPhone}). تابع سجل الأحداث لتأكيد الإرسال.`
                    : `Admin notification queued for ${waAutoNotice.adminPhone}. Check the event log for dispatch confirmation.`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {waAutoNotice.status === "error" && (
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(true)}
                className="min-h-9 px-3 py-1 rounded-lg border border-current/30 font-bold text-xs hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
              >
                {ui.language === "ar" ? "إعادة الإرسال" : "Retry WhatsApp"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setWaAutoDismissed(true)}
              className="min-h-9 px-2.5 py-1 rounded-lg text-xs font-bold opacity-80 hover:opacity-100 cursor-pointer"
            >
              {ui("إغلاق")}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{ui(error)}</span>
        </div>
      )}

      {/* Prominent Financial Status Ribbon (§6: المبلغ المدفوع والمتبقي) */}
      {!isProforma && (
        <section className="theme-card p-5 sm:p-6 rounded-2xl border theme-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border pb-3.5">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-[var(--text-main)]">
                {ui("حالة السداد والتحصيل")}</h2>
            </div>
            <div>
              {isLoadingBalance ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-gold)]" aria-hidden="true" />
                  <span>{ui("تحديث الرصيد…")}</span>
                </span>
              ) : !balanceData ? (
                <span className="text-xs text-[var(--text-muted)]">
                  {ui.language === "ar" ? "الرصيد غير متاح؛ أعد المحاولة قبل تسجيل دفعة." : "Balance unavailable. Retry before recording a payment."}{" "}
                  <button type="button" className="underline text-[var(--accent-gold)] cursor-pointer" onClick={() => void loadBalance()}>
                    {ui("إعادة المحاولة")}
                  </button>
                </span>
              ) : isRefundDue ? (
                <span className="rounded-full bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 px-3 py-1 text-xs font-bold text-[var(--accent-gold)]">
                  {ui.language === "ar" ? "يوجد مبلغ مستحق للعميل" : "Customer refund due"}
                </span>
              ) : isFullyPaid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/12 text-emerald-800 border border-emerald-600/35 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                  <span>{ui("مدفوع بالكامل (0.00 ر.س متبقي)")}</span>
                </span>
              ) : isPartiallyPaid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/35 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                  <span>
                    {ui.language === "en"
                      ? `Partially paid (${formatMoneyValue(remainingText)} SAR remaining)`
                      : `دفعة جزئية (متبقي ${formatMoneyValue(remainingText)} ر.س)`}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" aria-hidden="true" />
                  <span>{ui("غير مدفوع / آجل بالكامل")}</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
              <span className="text-xs text-[var(--text-muted)] block">{ui("الإجمالي الشامل (15%)")}</span>
              <strong className="mt-1 block font-mono text-lg sm:text-xl font-semibold text-[var(--text-main)]">
                <bdi dir="ltr">{formatMoneyValue(data.snapshot.totals.gross)}</bdi>{" "}
                <span className="text-xs text-[var(--accent-gold)] font-bold">{ui("ر.س")}</span>
              </strong>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/12 border border-emerald-600/35 dark:bg-emerald-950/45 dark:border-emerald-500/35">
              <span className="text-xs text-emerald-800 dark:text-emerald-300 block font-bold">
                {ui("المبلغ المدفوع (المحصل)")}</span>
              <strong className="mt-1 block font-mono text-lg sm:text-xl font-semibold text-emerald-800 dark:text-emerald-300">
                <bdi dir="ltr">{balanceData ? formatMoneyValue(paidText) : "—"}</bdi>{" "}
                <span className="text-xs font-bold">{ui("ر.س")}</span>
              </strong>
            </div>

            <div className="p-4 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30">
              <span className="text-xs text-[var(--accent-gold)] block font-bold">
                {isRefundDue ? (ui.language==="ar"?"مبلغ مستحق للعميل":"Refund due to customer") : ui("المتبقي للمتابعة")}</span>
              <strong
                className={`mt-1 block font-mono text-lg sm:text-xl font-semibold ${
                  isFullyPaid ? "text-[var(--text-muted)]" : "text-[var(--accent-gold)]"
                }`}
              >
                <bdi dir="ltr">{balanceData ? formatMoneyValue(remainingText) : "—"}</bdi>{" "}
                <span className="text-xs font-bold">{ui("ر.س")}</span>
              </strong>
            </div>
          </div>

          {/* Quick Actions & Note issuance bar (§7) */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {canWriteAccounting && !data.visibility?.isArchived && balanceData && !isFullyPaid && !isRefundDue && !isCredit && (
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3.5 py-1.5 rounded-lg gold-gradient-btn text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{ui("تسجيل دفعة جديدة للعميل")}</span>
                </button>
              )}

              {canCreateInvoices && !isCredit && (
                <Link
                  href={`/admin/invoices/new?type=TAX&kind=CREDIT&originalInvoiceId=${encodeURIComponent(id)}`}
                  className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:border-rose-500 text-rose-700 dark:text-rose-400 text-xs font-bold transition"
                  title={ui("إصدار إشعار دائن لخفض قيمة الفاتورة أو إلغائها")}
                >
                  <FileMinus className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" aria-hidden="true" />
                  <span>{ui("خفض قيمة الفاتورة (إشعار دائن)")}</span>
                </Link>
              )}

              {canCreateInvoices && (
                <Link
                  href={`/admin/invoices/new?type=TAX&kind=DEBIT&originalInvoiceId=${encodeURIComponent(id)}`}
                  className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)] hover:border-[var(--accent-gold)] text-[var(--accent-gold)] text-xs font-bold transition"
                  title={ui("إصدار إشعار مدين لإضافة مبالغ إلى الفاتورة")}
                >
                  <FilePlus className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                  <span>{ui("إضافة مبلغ (إشعار مدين)")}</span>
                </Link>
              )}
            </div>

            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
              {data.visibility?.isArchived&&<span className="text-xs">{ui.language==="ar"?"الفاتورة في قائمة المحذوفات؛ بياناتها المالية محفوظة.":"Invoice is in Removed invoices; its financial records are retained."}</span>}
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
              <h2 className="font-semibold text-base text-[var(--text-main)] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
                <span>{ui("بيانات الفاتورة والأطراف")}</span>
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--text-muted)]">
                <CreditCard className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                {ui(PAYMENT_LABELS[data.snapshot.input.paymentCode] || data.snapshot.input.paymentCode)}
              </span>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                <dt className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                  <span>{ui("الشركة المصدرة")}</span>
                </dt>
                <dd className="mt-1 font-semibold text-[var(--text-main)]">
                  {issuer.legalName}
                </dd>
                {issuer.vatNumber && (
                  <dd className="mt-0.5 text-xs font-mono text-[var(--text-muted)]">
                    {ui("الرقم الضريبي:")} <span dir="ltr">{issuer.vatNumber}</span>
                  </dd>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                <dt className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                  <span>{ui("فاتورة باسم (العميل)")}</span>
                </dt>
                <dd className="mt-1 font-semibold text-[var(--text-main)]">
                  {buyer.name}
                </dd>
                {buyer.vatNumber && (
                  <dd className="mt-0.5 text-xs font-mono text-[var(--text-muted)]">
                    {ui("الرقم الضريبي للعميل:")} <span dir="ltr">{buyer.vatNumber}</span>
                  </dd>
                )}
              </div>

              <div>
                <dt className="text-xs text-[var(--text-muted)]">{ui("تاريخ الفاتورة")}</dt>
                <dd className="mt-1 font-bold font-mono text-[var(--text-main)]" dir="ltr">
                  {dateLabel(data.invoiceDate, ui.language)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-[var(--text-muted)]">{ui("طريقة استلام المبلغ")}</dt>
                <dd className="mt-1 font-bold text-[var(--text-main)]">
                  {ui(PAYMENT_LABELS[data.snapshot.input.paymentCode] || data.snapshot.input.paymentCode)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Financial Breakdown Banner */}
          <div className="pt-4 border-t theme-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                <span className="text-xs text-[var(--text-muted)] block">{ui("قبل الضريبة")}</span>
                <strong className="mt-1 block font-mono text-base font-semibold text-[var(--text-main)]">
                  <bdi dir="ltr">{data.snapshot.totals.net}</bdi> {ui("ر.س")}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                <span className="text-xs text-[var(--text-muted)] block">{ui("ضريبة المبيعات (15%)")}</span>
                <strong className="mt-1 block font-mono text-base font-semibold text-[var(--accent-gold)]">
                  <bdi dir="ltr">{data.snapshot.totals.vat}</bdi> {ui("ر.س")}
                </strong>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900 dark:bg-slate-800/95 border border-slate-700 px-5 py-4 text-white flex items-center justify-between gap-4 shadow-sm">
              <div>
                <span className="text-xs text-slate-200 block">{ui("الإجمالي الشامل للضريبة")}</span>
                <p className="text-lg sm:text-xl font-semibold mt-0.5">
                  {ui("الإجمالي:")} <bdi className="font-mono text-amber-300" dir="ltr">{data.snapshot.totals.gross}</bdi> {ui("ر.س")}
                </p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-slate-800 dark:bg-slate-700/80 border border-slate-600 text-xs font-mono text-amber-300">
                SAR
              </span>
            </div>
          </div>
        </section>

        {/* Customer Verification Link & QR Card */}
        <section className="lg:col-span-4 theme-card rounded-2xl border theme-border p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 border-b theme-border pb-3">
              <QrCode className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[var(--text-main)]">
                {ui("رابط الفاتورة للعميل")}</h2>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-muted)]">
              {ui("امسح الرمز أو انسخ الرابط لمشاركته مع العميل لعرض الفاتورة والتحقق منها وتنزيل نسخة العميل الرسمية.")}</p>
          </div>

          <div className="flex justify-center py-2">
            <div className="p-3 rounded-2xl bg-white border border-[var(--border-color)] shadow-xs">
              <InvoiceQr invoiceId={id} />
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={copyVerificationUrl}
              className="w-full min-h-11 sm:min-h-9 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] hover:border-[var(--accent-gold)] px-4 py-1.5 text-xs font-bold text-[var(--accent-gold)] transition cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                  <span>{ui("تم نسخ رابط العميل بنجاح!")}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>{ui("نسخ رابط التحقق للعميل")}</span>
                </>
              )}
            </button>

            <a
              href={data.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-11 sm:min-h-9 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-4 py-1.5 text-xs font-bold text-[var(--text-main)] transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("فتح رابط الفاتورة")}</span>
            </a>
          </div>
        </section>
      </div>

      {/* Explanatory «ماذا يعني هذا؟» Box (§6, §7) */}
      <section className="theme-card rounded-2xl border theme-border p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b theme-border pb-3">
          <HelpCircle className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
            {ui("ماذا يعني هذا؟ (شرح العمليات المالية لهذه الفاتورة)")}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
          <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border theme-border space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
              <Clock className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("المبلغ المتبقي")}</span>
            </div>
            <p className="text-[var(--text-muted)]">
              {ui("يمثل الرصيد المعلق على ذمة العميل (1103) حتى يتم استلام حوالة بنكية أو نقدية وتسجيل سند قبض لتسوية الفاتورة.")}</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border theme-border space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
              <FileMinus className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" aria-hidden="true" />
              <span>{ui("إشعار دائن (خفض القيمة)")}</span>
            </div>
            <p className="text-[var(--text-muted)]">
              {ui("يُستخدم عند إلغاء الرحلة أو رد جزء من المبلغ للعميل؛ لا يتم حذف الفاتورة الأصلية بل يصدر إشعار يخفض الإيراد والضريبة نظامياً.")}</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border theme-border space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
              <FilePlus className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("إشعار مدين (إضافة مبلغ)")}</span>
            </div>
            <p className="text-[var(--text-muted)]">
              {ui("يُستخدم عند تمديد مدة الإيجار أو إضافة خدمات ومسارات إضافية بعد صدور الفاتورة، فيضاف المبلغ للإقرار والذمم تلقائياً.")}</p>
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
          <h2 className="mb-4 text-base font-semibold text-[var(--text-main)] flex items-center gap-2 border-b theme-border pb-3">
            <Landmark className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{ui("بيانات التحويل البنكي")}</span>
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
                  className="p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border"
                >
                  <dt className="text-xs text-[var(--text-muted)]">{ui(label)}</dt>
                  <dd dir="auto" className="mt-1 break-all font-bold font-mono text-[var(--text-main)]">
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
          <h2 className="text-base font-semibold text-[var(--text-main)] flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{ui("بنود الخدمات والرسوم (")}{data.snapshot.input.lines.length})</span>
          </h2>
        </div>

        <div className="md:hidden p-3.5 space-y-3">
          {data.snapshot.input.lines.map((line, index) => (
            <MobileRecordCard
              key={index}
              title={line.description}
              badge={
                <span className="px-2 py-0.5 rounded-md bg-[var(--accent-surface)] text-[var(--accent-gold)] font-mono font-bold text-xs">
                  {line.rate}%
                </span>
              }
            >
              <MobileCardMetaGrid columns={3}>
                <MobileCardField
                  label={ui("الكمية")}
                  value={
                    <span>
                      <span className="font-mono">{line.quantity}</span>{" "}
                      {line.billingUnit ? ui(BILLING_UNIT_LABELS[line.billingUnit]) : ""}
                    </span>
                  }
                />
                <MobileCardField
                  label={ui("السعر")}
                  mono
                  value={
                    <bdi dir="ltr">
                      {line.unitPrice} {ui("ر.س")}
                    </bdi>
                  }
                />
                <MobileCardField
                  label={ui("الخصم")}
                  mono
                  value={
                    <bdi dir="ltr">
                      {line.discount} {ui("ر.س")}
                    </bdi>
                  }
                />
              </MobileCardMetaGrid>
            </MobileRecordCard>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-start text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-[var(--table-header-bg)] border-b theme-border text-[var(--text-muted)] font-bold">
                {["البيان", "الكمية", "السعر", "الخصم", "الضريبة"].map((label) => (
                  <th key={label} className="p-3.5 whitespace-nowrap">
                    {ui(label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {data.snapshot.input.lines.map((line, index) => (
                <tr key={index} className="hover:bg-[var(--table-row-hover)] transition">
                  <td className="p-3.5 font-bold text-[var(--text-main)]">
                    {line.description}
                  </td>
                  <td className="p-3.5 whitespace-nowrap font-semibold">
                    <span className="font-mono">{line.quantity}</span>{" "}
                    {line.billingUnit ? ui(BILLING_UNIT_LABELS[line.billingUnit]) : ""}
                  </td>
                  <td className="p-3.5 font-mono whitespace-nowrap" dir="ltr">
                    {line.unitPrice} {ui("ر.س")}</td>
                  <td className="p-3.5 font-mono text-[var(--text-muted)] whitespace-nowrap" dir="ltr">
                    {line.discount} {ui("ر.س")}</td>
                  <td className="p-3.5 font-mono whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--accent-surface)] text-[var(--accent-gold)] font-bold text-xs">
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
      {canWriteAccounting && showPaymentModal && (
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

      {/* WhatsApp Modal */}
      {canSendInvoiceWhatsApp && showWhatsAppModal && (
        <SendWhatsAppModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          type="INVOICE"
          targetId={data.id}
          targetTitle={data.invoiceNumber}
          recipientName={buyer.name}
          defaultPhone={data.snapshot.input.transport?.contactPhone || ""}
        />
      )}
    </div>
  );
}
