"use client";
import { useReportPeriod } from "@/lib/use-report-period";
import { useUiText } from "@/lib/ui-text";


import Link from "next/link";
import { useState, useMemo } from "react";
import { Calculator, Download, RefreshCw, AlertCircle, CheckCircle2, ExternalLink, ShoppingBag, ReceiptText, FileSpreadsheet, FileCheck2, TrendingDown, TrendingUp } from "lucide-react";
import { amountLabel, downloadAccounting, periodQuery, vatPeriodEnd, type VatReport } from "@/lib/accounting";
import { signedMoneyMinor } from "@/lib/dashboard-analytics";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import AccountingPeriodSelector from "@/app/_components/AccountingPeriodSelector";
import { PageHeader } from "@/app/_components/ui";
import VatReturnTable from "./vat-return-table";
import ReturnSettings from "./return-settings";
import { useLanguage } from "@/lib/languageContext";

export default function VatReturnsPage() {
  const ui = useUiText();

  const { t, dir, isRTL } = useLanguage();
  const [period, setPeriod] = useReportPeriod();
  const [failure, setFailure] = useState("");
  const [seedMessage, setSeedMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [reload, setReload] = useState(0);
  const { year, quarter } = period;

  const vatHelpGuide = useMemo(() => ({
    title: isRTL ? "دليل إعداد ومطابقة الإقرار الضريبي (الخانات 1–16)" : "VAT Return Preparation Guide (Boxes 1–16)",
    summary: isRTL
      ? "يجهز هذا القسم أرقام الإقرار من المستندات المسجلة وتواريخ احتساب الضريبة، مع استبعاد المسودات والفواتير المبدئية. راجع المستندات وفروق التقريب قبل التقديم."
      : "Prepares return figures from recorded documents and VAT dates, excluding drafts and proformas. Review the evidence and rounding differences before filing.",
    cards: [
      {
        title: isRTL ? "١. ضريبة المبيعات والمخرجات (1–6)" : "1. Output Sales VAT (Boxes 1–6)",
        badge: "Output VAT",
        items: [
          {
            label: isRTL ? "الخانة 1 (المبيعات الخاضعة 15%)" : "Box 1 (Standard 15% Sales)",
            description: isRTL
              ? "تُعرض المبالغ قبل الضريبة. يخفض الإشعار الدائن المبلغ أو يظهر كتعديل بحسب الفترة الأصلية وتاريخ تقديم إقرارها."
              : "Amounts exclude VAT. Credits reduce Amount or appear as Adjustments according to the original period and its filing date.",
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
      ? "استخدم «نسخ للإدخال» للحقول القابلة للتعبئة، و«نسخ للمطابقة» لمراجعة الضريبة والإجماليات التي تحتسبها البوابة."
      : "Use Copy for entry for editable fields, and Copy for review to reconcile VAT and totals calculated by the portal.",
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

  const isRefundable = signedMoneyMinor(data?.summary.netVatDue) < BigInt(0);

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
              href="/admin/vat-returns/selected"
              className="theme-card inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] transition shadow-2xs"
            >
              <FileCheck2 className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("اختيار فواتير لتقرير مستقل")}</span>
            </Link>

            <Link
              href="/admin/purchases"
              className="theme-card inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] transition shadow-2xs"
            >
              <ShoppingBag className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui(t("purchases.title"))}</span>
            </Link>

            <Link
              href="/admin/invoices"
              className="theme-card inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] transition shadow-2xs"
            >
              <ReceiptText className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui(t("invoice.title"))}</span>
            </Link>
          </>
        }
      />

      {/* Official ZATCA Submission Notice Banner (§14.1) */}
      <div className="p-4 rounded-2xl border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] text-[var(--text-main)] text-xs sm:text-sm leading-relaxed flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--accent-gold)] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <strong className="font-semibold text-[var(--text-main)] block">
            {isRTL ? "طريقة تقديم الإقرار الضريبي الرسمي:" : "Official ZATCA Tax Return Filing:"}
          </strong>
          <p className="text-[var(--text-main)]">
            {isRTL ? (
              <>
                {ui("يتم تقديم الإقرار الضريبي رسمياً عبر بوابة هيئة الزكاة والضريبة والجمارك (")}<a
                  href="https://zatca.gov.sa"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-[var(--accent-gold)] inline-flex items-center gap-0.5"
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
                  className="underline font-bold text-[var(--accent-gold)] inline-flex items-center gap-0.5"
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
          className="rounded-xl border border-emerald-600/35 bg-emerald-500/12 dark:border-emerald-500/35 dark:bg-emerald-950/45 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300"
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
            className="inline-flex min-h-11 sm:min-h-9 items-center px-3 py-1.5 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition shrink-0"
          >
            {isRTL ? "تعديل بيانات الشركة" : "Edit Company Profile"}
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
            className="theme-card inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] transition cursor-pointer"
            title={ui(t("common.refresh"))}
          >
            <RefreshCw
              className={`size-4 ${isLoading ? "animate-spin text-[var(--accent-gold)]" : ""}`}
              aria-hidden="true"
            />
            <span>{ui(t("common.refresh"))}</span>
          </button>

          <button
            type="button"
            disabled={!data || isLoading || isExporting}
            onClick={() => void download("csv")}
            className="theme-card inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] transition disabled:opacity-50 cursor-pointer"
            title="CSV"
          >
            <FileSpreadsheet className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{ui(t("accounting.exportCsv"))}</span>
          </button>

          <button
            type="button"
            disabled={!data || isLoading || isExporting}
            onClick={() => void download("pdf")}
            className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer"
            title="PDF"
          >
            <Download className="size-4" aria-hidden="true" />
            <span>{ui(t("common.downloadPdf"))}</span>
          </button>
        </div>
      </section>

      {period.mode !== "QUARTER" && (
        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-900 dark:text-sky-200 text-xs font-bold">
          {ui("ملاحظة: هذا العرض مخصص للتحليل الإحصائي للفترة المحددة. لتقديم الإقرار الفعلي للهيئة، اختر الربع الضريبي (Q1–Q4).")}</div>
      )}

      {isLoading && (
        <div
          role="status"
          className="theme-card space-y-4 rounded-2xl p-8 border theme-border"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-muted)]">
            <div className="size-5 border-2 border-[var(--accent-gold)]/25 border-t-[var(--accent-gold)] rounded-full animate-spin" />
            <span>{ui("جارٍ حساب خانات الإقرار ومطابقة القيود…")}</span>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Company & Due Date Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs p-4 rounded-2xl bg-[var(--bg-card-subtle)] border theme-border">
            <div>
              <p className="font-semibold text-[var(--text-main)] text-sm">
                {data.company.legalName}
              </p>
              <p className="text-[var(--text-muted)] mt-0.5 font-mono">
                {ui("الرقم الضريبي:")}{" "}
                <bdi dir="ltr" className="font-bold text-[var(--text-main)]">
                  {data.company.vatNumber}
                </bdi>
              </p>
            </div>
            <div className="text-end">
              <span className="text-[var(--text-muted)] block">{ui("الفترة الضريبية:")}</span>
              <p className="font-mono font-bold text-[var(--text-main)]">
                <bdi dir="ltr">{data.period.start}</bdi> {ui("إلى")}{" "}
                <bdi dir="ltr">{vatPeriodEnd(data.period)}</bdi>
              </p>
              {data.period.dueDate && (
                <p className="text-[var(--accent-gold)] font-bold mt-0.5">
                  {ui("آخر موعد اعتيادي للسداد:")}{" "}
                  <bdi dir="ltr" className="font-mono">{data.period.dueDate}</bdi>
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
              <span className="text-xs font-bold text-[var(--text-muted)] block">
                {ui("إجمالي صافي المبيعات")}</span>
              <p
                className="mt-2 font-mono text-lg sm:text-xl font-semibold text-[var(--text-main)]"
                dir="ltr"
              >
                {amountLabel(data.summary.netSales)}
              </p>
              <span className="text-xs text-[var(--text-muted)]">
                {ui("ر.س (غير شامل الضريبة)")}</span>
            </div>

            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-[var(--accent-gold)] block">
                {ui("ضريبة المبيعات (خ6)")}</span>
              <p
                className="mt-2 font-mono text-lg sm:text-xl font-semibold text-[var(--accent-gold)]"
                dir="ltr"
              >
                {amountLabel(data.summary.outputVat)}
              </p>
              <span className="text-xs text-[var(--text-muted)]">
                {ui("ر.س ضريبة مخرجات")}</span>
            </div>

            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-[var(--text-muted)] block">
                {ui("إجمالي المشتريات الداخلة في الإقرار")}</span>
              <p
                className="mt-2 font-mono text-lg sm:text-xl font-semibold text-[var(--text-main)]"
                dir="ltr"
              >
                {amountLabel(data.summary.netPurchases)}
              </p>
              <span className="text-xs text-[var(--text-muted)]">
                {ui("ر.س تكاليف الأسطول")}</span>
            </div>

            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block">
                {ui("ضريبة قابلة للخصم (خ12)")}</span>
              <p
                className="mt-2 font-mono text-lg sm:text-xl font-semibold text-emerald-700 dark:text-emerald-300"
                dir="ltr"
              >
                {amountLabel(data.summary.recoverableInputVat)}
              </p>
              <span className="text-xs text-[var(--text-muted)]">
                {ui("ر.س ضريبة مدخلات")}</span>
            </div>

            <div
              className={`rounded-2xl border p-4 sm:p-5 col-span-2 lg:col-span-1 ${
                isRefundable
                  ? "bg-emerald-500/12 border-emerald-600/45 text-[var(--text-main)] dark:bg-emerald-950/45 dark:border-emerald-500/45"
                  : "bg-slate-900 dark:bg-slate-800/95 text-white border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold block ${isRefundable ? "text-[var(--text-main)]" : "text-slate-200"}`}>
                  {ui(isRefundable
                    ? "رصيد دائن لصالح المنشأة (خ16)"
                    : "صافي الضريبة المستحقة (خ16)")}
                </span>
                {isRefundable ? (
                  <TrendingDown className="size-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                ) : (
                  <TrendingUp className="size-4 text-amber-300" aria-hidden="true" />
                )}
              </div>
              <p
                className={`mt-2 font-mono text-xl sm:text-2xl font-semibold ${isRefundable ? "text-emerald-800 dark:text-emerald-300" : "text-amber-300"}`}
                dir="ltr"
              >
                {amountLabel(data.summary.netVatDue)}
              </p>
              <span className={`text-xs ${isRefundable ? "text-[var(--text-muted)]" : "text-slate-300"}`}>
                {ui(isRefundable
                  ? "يخضع الاسترداد أو الترحيل للإجراء المناسب لدى الهيئة"
                  : "واجب السداد لهيئة الزكاة")}
              </span>
            </div>
          </section>

          {/* 4. Table 1–16 Boxes with clean copy buttons (§14.4) */}
          <VatReturnTable rows={data.rows} domesticPurchasesOnly={data.coverage.domesticPurchasesOnly} />

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
              <FileCheck2 className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
                {ui("مطابقة وفحص القيود المسجلة")}</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                <span className="text-[var(--text-muted)] block mb-1">
                  {ui("إجمالي مشتريات الأسطول:")}</span>
                <strong className="font-mono font-bold text-sm text-[var(--text-main)]">
                  <bdi dir="ltr">{amountLabel(data.summary.netPurchases)}</bdi> {ui("ر.س")}
                </strong>
                <span className="text-xs text-[var(--text-muted)] block mt-1">
                  {ui("ضريبة مسجلة:")}{" "}
                  <bdi dir="ltr">{amountLabel(data.summary.recordedInputVat)}</bdi> {ui("ر.س")}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                <span className="text-[var(--text-muted)] block mb-1">
                  {ui("الضريبة غير القابلة للخصم:")}</span>
                <strong className="font-mono font-bold text-sm text-[var(--text-main)]">
                  <bdi dir="ltr">{amountLabel(data.summary.nonRecoverableInputVat)}</bdi> {ui("ر.س")}
                </strong>
                <span className="text-xs text-[var(--text-muted)] block mt-1">
                  {ui("تُضاف تلقائياً إلى تكلفة المصروف")}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                <span className="text-[var(--text-muted)] block mb-1">
                  {ui("فواتير مبدئية مستبعدة:")}</span>
                <strong className="font-mono font-bold text-sm text-[var(--text-main)]">
                  {data.coverage.proformaCount} {ui("فاتورة")}
                </strong>
                <span className="text-xs text-[var(--text-muted)] block mt-1">
                  {ui("عروض أسعار لا تدخل في الإقرار")}</span>
              </div>
            </div>

            {/* Warnings list if any */}
            {data.warnings.length > 0 ? (
              <div className="p-4 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 text-xs text-[var(--text-main)] space-y-1.5">
                <strong className="font-semibold block text-[var(--accent-gold)]">
                  {ui("ملاحظات التحقق من القيود:")}</strong>
                {data.warnings.map((w, idx) => (
                  <p key={idx} className="flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                    <span>{ui(w)}</span>
                  </p>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/12 border border-emerald-600/35 text-xs font-bold text-emerald-800 dark:bg-emerald-950/45 dark:border-emerald-500/35 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  {ui("لا توجد تنبيهات حسابية في هذا التقرير. راجع المستندات ونطاق التغطية قبل التقديم.")}</span>
              </div>
            )}

            {/* 7. Document Drill-down (§14.7) */}
            <details className="mt-4 border-t theme-border pt-4">
              <summary className="min-h-11 flex items-center cursor-pointer text-xs font-bold text-[var(--accent-gold)] hover:underline">
                {ui("عرض المستندات المؤيدة للإقرار (فواتير المبيعات:")}{" "}
                {data.sales.length} {ui("· فواتير المشتريات:")} {data.purchases.length})
              </summary>
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto text-xs divide-y theme-border">
                {data.sales.map((row) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 pt-2.5"
                    key={`${row.source}-${row.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Link
                        className="font-mono font-semibold text-[var(--accent-gold)] hover:underline"
                        href={`/admin/invoices/${row.id}`}
                      >
                        <bdi>{row.number}</bdi>
                      </Link>
                      <span className="text-[var(--text-muted)]">
                        {ui({
                          CREDIT: "إشعار دائن (تخفيض)",
                          DEBIT: "إشعار مدين (إضافة)",
                          INVOICE: "فاتورة مبيعات",
                        }[row.kind] || row.kind)}
                      </span>
                    </div>
                    <p className="font-mono text-[var(--text-main)]">
                      <bdi dir="ltr">{row.date}</bdi> {ui("· الصافي:")}{" "}
                      <strong dir="ltr">{row.net}</strong> {ui("· الضريبة:")}{" "}
                      <strong dir="ltr">{row.vat}</strong> {ui("ر.س")}
                    </p>
                  </div>
                ))}

                {data.purchases.map((row) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 pt-2.5"
                    key={row.id}
                  >
                    <p className="font-bold text-[var(--text-main)]">
                      {row.supplierName} ·{" "}
                      <span className="font-mono text-[var(--text-muted)]">
                        {row.invoiceNumber}
                      </span>
                    </p>
                    <p className="font-mono text-[var(--text-main)]">
                      {ui("الصافي:")} <strong dir="ltr">{row.netAmount}</strong>{" "}
                      {ui("· ضريبة قابلة للخصم:")}{" "}
                      <strong dir="ltr" className="text-emerald-700 dark:text-emerald-300">
                        {row.recoverableVat}
                      </strong>{" "}
                      {ui("ر.س")}
                    </p>
                  </div>
                ))}

                {data.sales.length + data.purchases.length === 0 && (
                  <p className="py-4 text-center text-[var(--text-muted)]">
                    {ui("لا توجد مستندات مسجلة ضمن هذه الفترة.")}</p>
                )}
              </div>
            </details>
          </section>

          {/* Footer note & link */}
          <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)] pt-2">
            <p>
              {ui("آخر احتساب:")}{" "}
              {new Date(data.generatedAt).toLocaleString(ui.locale, {
                calendar: "gregory",
                timeZone: "Asia/Riyadh",
              })}
            </p>
            <a
              href="https://zatca.gov.sa/en/eServices/UserManual/Pages/UserManual-009.aspx"
              target="_blank"
              rel="noreferrer"
              className="hover:underline flex items-center gap-1 text-[var(--accent-gold)] font-bold"
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
