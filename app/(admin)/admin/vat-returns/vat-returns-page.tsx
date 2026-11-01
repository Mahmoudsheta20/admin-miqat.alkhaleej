"use client";
import { useUiText } from "@/lib/ui-text";


import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Calculator,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShoppingBag,
  ReceiptText,
  FileSpreadsheet,
  FileCheck2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  amountLabel,
  defaultReportPeriod,
  downloadAccounting,
  periodQuery,
  type VatReport,
} from "@/lib/accounting";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import AccountingPeriodSelector from "@/app/_components/AccountingPeriodSelector";
import { PageHeader } from "@/app/_components/ui";
import VatReturnTable from "./vat-return-table";
import ReturnSettings from "./return-settings";
import { useLanguage } from "@/lib/languageContext";

export default function VatReturnsPage() {
  const ui = useUiText();

  const { t, dir, isRTL } = useLanguage();
  const [period, setPeriod] = useState(defaultReportPeriod);
  const [failure, setFailure] = useState("");
  const [seedMessage, setSeedMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [reload, setReload] = useState(0);
  const { year, quarter } = period;

  const vatHelpGuide = useMemo(() => ({
    title: isRTL ? "دليل إعداد ومطابقة الإقرار الضريبي (الخانات 1–16)" : "VAT Return Preparation Guide (Boxes 1–16)",
    summary: isRTL
      ? "يحتسب هذا القسم نموذج الإقرار الضريبي الرسمي بدقة هللة واحدة بناءً على تاريخ الإصدار والاحتساب الفعلي للفواتير المسجلة، مع استبعاد المسودات والفواتير المبدئية."
      : "Computes official ZATCA VAT return boxes to the exact halala based on actual invoice issue dates, excluding drafts and proforma quotes.",
    cards: [
      {
        title: isRTL ? "١. ضريبة المبيعات والمخرجات (1–6)" : "1. Output Sales VAT (Boxes 1–6)",
        badge: "Output VAT",
        items: [
          {
            label: isRTL ? "الخانة 1 (المبيعات الخاضعة 15%)" : "Box 1 (Standard 15% Sales)",
            description: isRTL
              ? "تُعرض المبالغ الصافية قبل الضريبة، وأي تخفيضات أو إلغاءات تظهر في عمود التعديل كإشعارات دائنة."
              : "Net sales before tax; cancellations and reductions appear as credit note adjustments.",
          },
          {
            label: isRTL ? "الخانة 6 (إجمالي ضريبة المبيعات)" : "Box 6 (Total Output VAT)",
            description: isRTL
              ? "مجموع ضريبة القيمة المضافة المحصلة عن كافة الرحلات والتوريدات الخاضعة خلال الفترة."
              : "Total VAT collected across all taxable trips and services during the period.",
          },
        ],
      },
      {
        title: isRTL ? "٢. ضريبة المشتريات والمدخلات (7–12)" : "2. Input Purchases VAT (Boxes 7–12)",
        badge: "Input VAT",
        items: [
          {
            label: isRTL ? "الخانة 7 (المشتريات الخاضعة 15%)" : "Box 7 (Standard 15% Purchases)",
            description: isRTL
              ? "صافي مشتريات الوقود والصيانة والتكاليف المؤيدة بفواتير ضريبية صحيحة للموردين."
              : "Net fuel, maintenance, and operating purchases supported by valid supplier tax invoices.",
          },
          {
            label: isRTL ? "الخانة 12 (إجمالي الضريبة القابلة للاسترداد)" : "Box 12 (Total Recoverable Input VAT)",
            description: isRTL
              ? "مجموع الضريبة المؤهلة للخصم بعد استبعاد المصروفات غير الخاضعة كرواتب السائقين والرسوم الحكومية."
              : "Total deductible VAT excluding non-taxable costs like driver salaries and licensing fees.",
          },
        ],
      },
      {
        title: isRTL ? "٣. التسوية وصافي الضريبة (13–16)" : "3. Settlement & Net VAT (Boxes 13–16)",
        badge: isRTL ? "الرصيد النهائي" : "Net Balance",
        items: [
          {
            label: isRTL ? "الخانة 13 (ضريبة الفترة)" : "Box 13 (Total VAT Due for Period)",
            description: isRTL
              ? "الفارق بين ضريبة المبيعات وضريبة المشتريات (الخانة 6 − الخانة 12)."
              : "Net output tax minus recoverable input tax (Box 6 − Box 12).",
          },
          {
            label: isRTL ? "الخانة 16 (صافي الضريبة المستحقة أو المستردة)" : "Box 16 (Net VAT Due or Refundable)",
            description: isRTL
              ? "الرقم النهائي الواجب سداده للهيئة أو رصيد دائن مستحق للمنشأة بعد خصم الرصيد المرحل والتصحيحات."
              : "Final amount payable to ZATCA or refundable credit after carried forward balance and corrections.",
          },
        ],
      },
    ],
    tip: isRTL
      ? "اضغط على زر النسخ بجانب أي رقم لنسخ الرقم العشري النظيف بدون فواصل أو رموز للصقه مباشرة في خانة بوابة الزكاة."
      : "Click the copy button beside any figure to copy a clean number for direct pasting into the ZATCA portal.",
    formula: "Box 16 = Box 6 (Output VAT) − Box 12 (Recoverable Input VAT) + Box 14 (Corrections) − Box 15 (Carried Credit)",
  }), [isRTL]);

  async function download(format: "pdf" | "csv") {
    setFailure("");
    setIsExporting(true);
    try {
      await downloadAccounting(
        `/exports/${format}?${periodQuery(period)}`,
        `miqat-vat-return-${year}-Q${quarter}.${format}`,
      );
    } catch (e) {
      setFailure(
        e instanceof Error ? e.message : "تعذر التصدير؛ حاول مرة أخرى",
      );
    } finally {
      setIsExporting(false);
    }
  }

  const { data, error, isLoading } = useAccountingQuery<VatReport>(
    `/vat-return?${periodQuery(period)}`,
    reload,
  );

  const netVatDueNum = data ? Number(data.summary.netVatDue) : 0;
  const isRefundable = netVatDueNum < 0;

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      {/* 1. Header & Actions with On-Demand Guide */}
      <PageHeader
        title={ui(t("vat.title"))}
        subtitle={ui(t("vat.subtitle"))}
        badge={t("section.financeReview")}
        icon={Calculator}
        onRefresh={() => setReload((v) => v + 1)}
        isRefreshing={isLoading}
        helpGuide={vatHelpGuide}
        onSeeded={(msg) => {
          setFailure("");
          setSeedMessage(msg);
          setReload((v) => v + 1);
        }}
        onSeedError={(err) => {
          setSeedMessage("");
          setFailure(err);
        }}
        actions={
          <>
            <Link
              href="/admin/purchases"
              className="theme-card inline-flex items-center gap-1.5 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs"
            >
              <ShoppingBag className="size-4 text-amber-500" />
              <span>{ui(t("purchases.title"))}</span>
            </Link>

            <Link
              href="/admin/invoices"
              className="theme-card inline-flex items-center gap-1.5 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs"
            >
              <ReceiptText className="size-4 text-amber-500" />
              <span>{ui(t("invoice.title"))}</span>
            </Link>
          </>
        }
      />

      {/* Official ZATCA Submission Notice Banner (§14.1) */}
      <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 text-amber-900 dark:text-amber-200 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-black text-slate-900 dark:text-white block">
            {ui(isRTL ? "طريقة تقديم الإقرار الضريبي الرسمي:" : "Official ZATCA Tax Return Filing:")}
          </strong>
          <p>
            {isRTL ? (
              <>
                {ui("يتم تقديم الإقرار الضريبي رسمياً عبر بوابة هيئة الزكاة والضريبة والجمارك (")}<a
                  href="https://zatca.gov.sa"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-amber-700 dark:text-amber-400 inline-flex items-center gap-0.5"
                >
                  zatca.gov.sa
                  <ExternalLink className="size-3" />
                </a>
                {ui("). صُممت هذه الصفحة لمراجعة وتدقيق مبالغ المبيعات والمشتريات بدقة، وتتيح لك نسخ الأرقام بنقرة واحدة ولصقها في الخانة المقابلة بالبوابة.")}</>
            ) : (
              <>
                File your official tax return via the ZATCA portal (
                <a
                  href="https://zatca.gov.sa"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-amber-700 dark:text-amber-400 inline-flex items-center gap-0.5"
                >
                  zatca.gov.sa
                  <ExternalLink className="size-3" />
                </a>
                ). This page audits sales and purchases, enabling single-click copy for portal entry.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {seedMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400"
        >
          {ui(seedMessage)}
        </p>
      )}
      {failure && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{ui(failure)}</span>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{ui(error)}</span>
          </div>
          <Link
            href="/admin/invoices/settings"
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shrink-0"
          >
            {ui(isRTL ? "تعديل بيانات الشركة" : "Edit Company Profile")}
          </Link>
        </div>
      )}

      {/* 2. Period Selector & Refresh / Export Bar (§14.2) */}
      <section className="theme-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border theme-border p-4 sm:p-5">
        <AccountingPeriodSelector value={period} onChange={setPeriod} />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            disabled={isLoading}
            className="theme-card inline-flex items-center gap-1.5 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
            title={ui(t("common.refresh"))}
          >
            <RefreshCw
              className={`size-4 ${isLoading ? "animate-spin text-amber-500" : ""}`}
            />
            <span>{ui(t("common.refresh"))}</span>
          </button>

          <button
            type="button"
            disabled={!data || isLoading || isExporting}
            onClick={() => void download("csv")}
            className="theme-card inline-flex items-center gap-1.5 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition disabled:opacity-50 cursor-pointer"
            title="CSV"
          >
            <FileSpreadsheet className="size-4 text-emerald-500" />
            <span>{ui(t("accounting.exportCsv"))}</span>
          </button>

          <button
            type="button"
            disabled={!data || isLoading || isExporting}
            onClick={() => void download("pdf")}
            className="gold-gradient-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer"
            title="PDF"
          >
            <Download className="size-4" />
            <span>{ui(t("common.downloadPdf"))}</span>
          </button>
        </div>
      </section>

      {period.mode !== "QUARTER" && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-bold">
          {ui("ملاحظة: هذا العرض مخصص للتحليل الإحصائي للفترة المحددة. لتقديم الإقرار الفعلي للهيئة، اختر الربع الضريبي (Q1–Q4).")}</div>
      )}

      {isLoading && (
        <div
          role="status"
          className="theme-card space-y-4 rounded-2xl p-8 border theme-border"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
            <div className="size-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <span>{ui("جارٍ حساب خانات الإقرار ومطابقة القيود…")}</span>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Company & Due Date Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border theme-border">
            <div>
              <p className="font-black text-slate-900 dark:text-white text-sm">
                {data.company.legalName}
              </p>
              <p className="text-slate-500 mt-0.5 font-mono">
                {ui("الرقم الضريبي:")}{ui(" ")}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {ui(data.company.vatNumber)}
                </span>
              </p>
            </div>
            <div className="text-end">
              <span className="text-slate-400 block">{ui("الفترة الضريبية:")}</span>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {ui(data.period.start)} {ui("إلى")} {ui(data.period.endExclusive)}
              </p>
              {data.period.dueDate && (
                <p className="text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                  {ui("آخر موعد اعتيادي للسداد:")}{ui(" ")}
                  <span className="font-mono">{ui(data.period.dueDate)}</span>
                </p>
              )}
            </div>
          </div>

          {/* 3. KPI Summary Ribbon (§14.3) */}
          <section
            className="grid grid-cols-2 lg:grid-cols-5 gap-3"
            aria-label={ui("ملخص الأرقام الحاسم")}
          >
            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-slate-500 block">
                {ui("صافي المبيعات (خ1)")}</span>
              <p
                className="mt-2 font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white"
                dir="ltr"
              >
                {ui(amountLabel(data.summary.netSales))}
              </p>
              <span className="text-[10px] text-slate-400">
                {ui("ر.س (غير شامل الضريبة)")}</span>
            </div>

            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">
                {ui("ضريبة المبيعات (خ6)")}</span>
              <p
                className="mt-2 font-mono text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400"
                dir="ltr"
              >
                {ui(amountLabel(data.summary.outputVat))}
              </p>
              <span className="text-[10px] text-slate-400">
                {ui("ر.س ضريبة مخرجات")}</span>
            </div>

            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-slate-500 block">
                {ui("المشتريات الخاضعة (خ7)")}</span>
              <p
                className="mt-2 font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white"
                dir="ltr"
              >
                {ui(amountLabel(data.summary.netPurchases))}
              </p>
              <span className="text-[10px] text-slate-400">
                {ui("ر.س تكاليف الأسطول")}</span>
            </div>

            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
                {ui("ضريبة قابلة للخصم (خ12)")}</span>
              <p
                className="mt-2 font-mono text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400"
                dir="ltr"
              >
                {ui(amountLabel(data.summary.recoverableInputVat))}
              </p>
              <span className="text-[10px] text-slate-400">
                {ui("ر.س ضريبة مدخلات")}</span>
            </div>

            <div
              className={`rounded-2xl border p-4 sm:p-5 col-span-2 lg:col-span-1 ${
                isRefundable
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                  : "bg-slate-900 dark:bg-slate-800 text-white border-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold opacity-80 block">
                  {ui(isRefundable
                    ? "رصيد دائن مسترد (خ16)"
                    : "صافي الضريبة للتحويل (خ16)")}
                </span>
                {isRefundable ? (
                  <TrendingDown className="size-4 text-emerald-500" />
                ) : (
                  <TrendingUp className="size-4 text-amber-400" />
                )}
              </div>
              <p
                className="mt-2 font-mono text-xl sm:text-2xl font-black text-amber-400"
                dir="ltr"
              >
                {ui(amountLabel(data.summary.netVatDue))}
              </p>
              <span className="text-[10px] opacity-70">
                {ui(isRefundable
                  ? "مستحق استرداده من الهيئة"
                  : "واجب السداد لهيئة الزكاة")}
              </span>
            </div>
          </section>

          {/* 4. Table 1–16 Boxes with clean copy buttons (§14.4) */}
          <VatReturnTable rows={data.rows} />

          {/* 5. Previous Balances & Settlement Settings (§14.6) */}
          {period.mode === "QUARTER" && (
            <ReturnSettings
              key={`${year}-${quarter}-${data.settings.version}`}
              year={year}
              quarter={quarter}
              value={data.settings}
              onSaved={() => setReload((value) => value + 1)}
            />
          )}

          {/* 6. Matching & Audit Checklist (§14.5) */}
          <section className="theme-card rounded-2xl border theme-border p-5 space-y-4">
            <div className="flex items-center gap-2 border-b theme-border pb-3">
              <FileCheck2 className="size-4 text-amber-500" />
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {ui("مطابقة وفحص القيود المسجلة")}</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border">
                <span className="text-slate-400 block mb-1">
                  {ui("إجمالي مشتريات الأسطول:")}</span>
                <strong className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                  {ui(amountLabel(data.summary.netPurchases))} {ui("ر.س")}</strong>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {ui("ضريبة مسجلة:")}{ui(amountLabel(data.summary.recordedInputVat))} {ui("ر.س")}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border">
                <span className="text-slate-400 block mb-1">
                  {ui("الضريبة غير القابلة للخصم:")}</span>
                <strong className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                  {ui(amountLabel(data.summary.nonRecoverableInputVat))} {ui("ر.س")}</strong>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {ui("تُضاف تلقائياً إلى تكلفة المصروف")}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border">
                <span className="text-slate-400 block mb-1">
                  {ui("فواتير مبدئية مستبعدة:")}</span>
                <strong className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                  {ui(data.coverage.proformaCount)} {ui("فاتورة")}</strong>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {ui("عروض أسعار لا تدخل في الإقرار")}</span>
              </div>
            </div>

            {/* Warnings list if any */}
            {data.warnings.length > 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <strong className="font-black block">
                  {ui("ملاحظات التحقق من القيود:")}</strong>
                {data.warnings.map((w, idx) => (
                  <p key={idx} className="flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
                    <span>{ui(w)}</span>
                  </p>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>
                  {ui("كافة العمليات والقيود مطابقة للمواصفات الضريبية ولا توجد تنبيهات معلقة.")}</span>
              </div>
            )}

            {/* 7. Document Drill-down (§14.7) */}
            <details className="mt-4 border-t theme-border pt-4">
              <summary className="cursor-pointer text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline">
                {ui("عرض المستندات المؤيدة للإقرار (فواتير المبيعات:")}{ui(" ")}
                {ui(data.sales.length)} {ui("· فواتير المشتريات:")}{ui(data.purchases.length)})
              </summary>
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto text-xs divide-y theme-border">
                {data.sales.map((row) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 pt-2.5"
                    key={`${row.source}-${row.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Link
                        className="font-mono font-black text-amber-700 dark:text-amber-400 hover:underline"
                        href={`/admin/invoices/${row.id}`}
                      >
                        {ui(row.number)}
                      </Link>
                      <span className="text-slate-500">
                        {ui({
                          CREDIT: "إشعار دائن (تخفيض)",
                          DEBIT: "إشعار مدين (إضافة)",
                          INVOICE: "فاتورة مبيعات",
                        }[row.kind] || row.kind)}
                      </span>
                    </div>
                    <p className="font-mono text-slate-600 dark:text-slate-300">
                      <span>{ui(row.date)}</span> {ui("· الصافي:")}{ui(" ")}
                      <strong>{ui(row.net)}</strong> {ui("· الضريبة:")}{ui(" ")}
                      <strong>{ui(row.vat)}</strong> {ui("ر.س")}</p>
                  </div>
                ))}

                {data.purchases.map((row) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 pt-2.5"
                    key={row.id}
                  >
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {row.supplierName} ·{ui(" ")}
                      <span className="font-mono text-slate-500">
                        {ui(row.invoiceNumber)}
                      </span>
                    </p>
                    <p className="font-mono text-slate-600 dark:text-slate-300">
                      {ui("الصافي:")}<strong>{ui(row.netAmount)}</strong> {ui("· ضريبة قابلة للخصم:")}{ui(" ")}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {ui(row.recoverableVat)}
                      </strong>{ui(" ")}
                      {ui("ر.س")}</p>
                  </div>
                ))}

                {data.sales.length + data.purchases.length === 0 && (
                  <p className="py-4 text-center text-slate-400">
                    {ui("لا توجد مستندات مسجلة ضمن هذه الفترة.")}</p>
                )}
              </div>
            </details>
          </section>

          {/* Footer note & link */}
          <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-2">
            <p>
              {ui("آخر احتساب:")}{ui(" ")}
              {ui(new Date(data.generatedAt).toLocaleString(ui.locale, {
                calendar: "gregory",
                timeZone: "Asia/Riyadh",
              }))}
            </p>
            <a
              href="https://zatca.gov.sa/en/eServices/UserManual/Pages/UserManual-009.aspx"
              target="_blank"
              rel="noreferrer"
              className="hover:underline flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold"
            >
              <span>{ui("دليل هيئة الزكاة لتقديم الإقرار الإلكتروني")}</span>
              <ExternalLink className="size-3" />
            </a>
          </footer>
        </>
      )}
    </div>
  );
}
