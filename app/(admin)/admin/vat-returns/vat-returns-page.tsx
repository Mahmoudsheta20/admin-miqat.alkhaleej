"use client";

import Link from "next/link";
import { useState } from "react";
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
import SeedTestDataButton from "@/app/_components/SeedTestDataButton";
import SectionGuide from "@/app/_components/SectionGuide";
import VatReturnTable from "./vat-return-table";
import ReturnSettings from "./return-settings";

export default function VatReturnsPage() {
  const [period, setPeriod] = useState(defaultReportPeriod);
  const [failure, setFailure] = useState("");
  const [seedMessage, setSeedMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [reload, setReload] = useState(0);
  const { year, quarter } = period;

  async function download(format: "pdf" | "csv") {
    setFailure("");
    setIsExporting(true);
    try {
      await downloadAccounting(
        `/exports/${format}?${periodQuery(period)}`,
        `miqat-vat-return-${year}-Q${quarter}.${format}`
      );
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "تعذر التصدير؛ حاول مرة أخرى");
    } finally {
      setIsExporting(false);
    }
  }

  const { data, error, isLoading } = useAccountingQuery<VatReport>(
    `/vat-return?${periodQuery(period)}`,
    reload
  );

  const netVatDueNum = data ? Number(data.summary.netVatDue) : 0;
  const isRefundable = netVatDueNum < 0;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* 1. Header & Actions (§14) */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                المراجعة والإعدادات
              </span>
              <span className="text-xs text-slate-400 font-medium">
                هيئة الزكاة والضريبة والجمارك (ZATCA)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              الإقرار الضريبي (VAT Return)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              مراجعة وتدقيق خانات نموذج هيئة الزكاة (1–16) ونسخ المبالغ للبوابة الرسمية.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SeedTestDataButton
            onSeeded={(msg) => {
              setFailure("");
              setSeedMessage(msg);
              setReload((v) => v + 1);
            }}
            onError={(err) => {
              setSeedMessage("");
              setFailure(err);
            }}
          />

          <Link
            href="/admin/purchases"
            className="theme-card inline-flex items-center gap-1.5 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs"
          >
            <ShoppingBag className="size-4 text-amber-500" />
            <span>المصروفات والمشتريات</span>
          </Link>

          <Link
            href="/admin/invoices"
            className="theme-card inline-flex items-center gap-1.5 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs"
          >
            <ReceiptText className="size-4 text-amber-500" />
            <span>سجل الفواتير</span>
          </Link>
        </div>
      </header>

      {/* Official ZATCA Submission Notice Banner (§14.1) */}
      <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 text-amber-900 dark:text-amber-200 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-black text-slate-900 dark:text-white block">
            طريقة تقديم الإقرار الضريبي الرسمي:
          </strong>
          <p>
            يتم تقديم الإقرار الضريبي رسمياً عبر بوابة هيئة الزكاة والضريبة والجمارك (
            <a
              href="https://zatca.gov.sa"
              target="_blank"
              rel="noreferrer"
              className="underline font-bold text-amber-700 dark:text-amber-400 inline-flex items-center gap-0.5"
            >
              zatca.gov.sa
              <ExternalLink className="size-3" />
            </a>
            ). صُممت هذه الصفحة لمراجعة وتدقيق مبالغ المبيعات والمشتريات بدقة، وتتيح لك نسخ الأرقام بنقرة واحدة ولصقها في الخانة المقابلة بالبوابة.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {seedMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400"
        >
          {seedMessage}
        </p>
      )}
      {failure && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{failure}</span>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Link
            href="/admin/invoices/settings"
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shrink-0"
          >
            تعديل بيانات الشركة
          </Link>
        </div>
      )}

      {/* Guide Card (§2, §14) */}
      <SectionGuide
        title="دليل إعداد ومطابقة الإقرار الضريبي (الخانات 1–16)"
        summary="يحتسب هذا القسم نموذج الإقرار الضريبي الرسمي بدقة هللة واحدة بناءً على تاريخ الإصدار والاحتساب الفعلي للفواتير المسجلة، مع استبعاد المسودات والفواتير المبدئية."
        cards={[
          {
            title: "1. ضريبة المبيعات والمخرجات (1–6)",
            badge: "Output VAT",
            items: [
              {
                label: "الخانة 1 (المبيعات الخاضعة 15%)",
                description: "تُعرض المبالغ الصافية قبل الضريبة، وأي تخفيضات أو إلغاءات تظهر في عمود التعديل كإشعارات دائنة.",
              },
              {
                label: "الخانة 6 (إجمالي ضريبة المبيعات)",
                description: "مجموع ضريبة القيمة المضافة المحصلة عن كافة الرحلات والتوريدات الخاضعة خلال الفترة.",
              },
            ],
          },
          {
            title: "2. ضريبة المشتريات والمدخلات (7–12)",
            badge: "Input VAT",
            items: [
              {
                label: "الخانة 7 (المشتريات الخاضعة 15%)",
                description: "صافي مشتريات الوقود والصيانة والتكاليف المؤيدة بفواتير ضريبية صحيحة للموردين.",
              },
              {
                label: "الخانة 12 (إجمالي الضريبة القابلة للاسترداد)",
                description: "مجموع الضريبة المؤهلة للخصم بعد استبعاد المصروفات غير الخاضعة كرواتب السائقين والرسوم الحكومية.",
              },
            ],
          },
          {
            title: "3. التسوية وصافي الضريبة (13–16)",
            badge: "الرصيد النهائي",
            items: [
              {
                label: "الخانة 13 (ضريبة الفترة)",
                description: "الفارق بين ضريبة المبيعات وضريبة المشتريات (الخانة 6 − الخانة 12).",
              },
              {
                label: "الخانة 16 (صافي الضريبة المستحقة أو المستردة)",
                description: "الرقم النهائي الواجب سداده للهيئة أو رصيد دائن مستحق للمنشأة بعد خصم الرصيد المرحل والتصحيحات.",
              },
            ],
          },
        ]}
        tip="اضغط على زر النسخ بجانب أي رقم لنسخ الرقم العشري النظيف بدون فواصل أو رموز للصقه مباشرة في خانة بوابة الزكاة."
        formula="Box 16 = Box 6 (Output VAT) − Box 12 (Recoverable Input VAT) + Box 14 (Corrections) − Box 15 (Carried Credit)"
      />

      {/* 2. Period Selector & Refresh / Export Bar (§14.2) */}
      <section className="theme-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border theme-border p-4 sm:p-5">
        <AccountingPeriodSelector value={period} onChange={setPeriod} />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            disabled={isLoading}
            className="theme-card inline-flex items-center gap-1.5 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
            title="تحديث حسابات الإقرار"
          >
            <RefreshCw
              className={`size-4 ${isLoading ? "animate-spin text-amber-500" : ""}`}
            />
            <span>تحديث</span>
          </button>

          <button
            type="button"
            disabled={!data || isLoading || isExporting}
            onClick={() => void download("csv")}
            className="theme-card inline-flex items-center gap-1.5 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition disabled:opacity-50 cursor-pointer"
            title="تنزيل كشف تدقيق تفصيلي بصيغة CSV"
          >
            <FileSpreadsheet className="size-4 text-emerald-500" />
            <span>كشف تدقيق CSV</span>
          </button>

          <button
            type="button"
            disabled={!data || isLoading || isExporting}
            onClick={() => void download("pdf")}
            className="gold-gradient-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer"
            title="تنزيل مسودة الإقرار بصيغة PDF"
          >
            <Download className="size-4" />
            <span>مسودة الإقرار PDF</span>
          </button>
        </div>
      </section>

      {period.mode !== "QUARTER" && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-bold">
          ملاحظة: هذا العرض مخصص للتحليل الإحصائي للفترة المحددة. لتقديم الإقرار الفعلي للهيئة، اختر الربع الضريبي (Q1–Q4).
        </div>
      )}

      {isLoading && (
        <div role="status" className="theme-card space-y-4 rounded-2xl p-8 border theme-border">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
            <div className="size-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <span>جارٍ حساب خانات الإقرار ومطابقة القيود…</span>
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
                الرقم الضريبي: <span className="font-bold text-slate-800 dark:text-slate-200">{data.company.vatNumber}</span>
              </p>
            </div>
            <div className="text-left">
              <span className="text-slate-400 block">الفترة الضريبية:</span>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {data.period.start} إلى {data.period.endExclusive}
              </p>
              {data.period.dueDate && (
                <p className="text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                  آخر موعد اعتيادي للسداد: <span className="font-mono">{data.period.dueDate}</span>
                </p>
              )}
            </div>
          </div>

          {/* 3. KPI Summary Ribbon (§14.3) */}
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3" aria-label="ملخص الأرقام الحاسم">
            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-slate-500 block">صافي المبيعات (خ1)</span>
              <p className="mt-2 font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white" dir="ltr">
                {amountLabel(data.summary.netSales)}
              </p>
              <span className="text-[10px] text-slate-400">ر.س (غير شامل الضريبة)</span>
            </div>

            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">ضريبة المبيعات (خ6)</span>
              <p className="mt-2 font-mono text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400" dir="ltr">
                {amountLabel(data.summary.outputVat)}
              </p>
              <span className="text-[10px] text-slate-400">ر.س ضريبة مخرجات</span>
            </div>

            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-slate-500 block">المشتريات الخاضعة (خ7)</span>
              <p className="mt-2 font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white" dir="ltr">
                {amountLabel(data.summary.netPurchases)}
              </p>
              <span className="text-[10px] text-slate-400">ر.س تكاليف الأسطول</span>
            </div>

            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">ضريبة قابلة للخصم (خ12)</span>
              <p className="mt-2 font-mono text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
                {amountLabel(data.summary.recoverableInputVat)}
              </p>
              <span className="text-[10px] text-slate-400">ر.س ضريبة مدخلات</span>
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
                  {isRefundable ? "رصيد دائن مسترد (خ16)" : "صافي الضريبة للتحويل (خ16)"}
                </span>
                {isRefundable ? (
                  <TrendingDown className="size-4 text-emerald-500" />
                ) : (
                  <TrendingUp className="size-4 text-amber-400" />
                )}
              </div>
              <p className="mt-2 font-mono text-xl sm:text-2xl font-black text-amber-400" dir="ltr">
                {amountLabel(data.summary.netVatDue)}
              </p>
              <span className="text-[10px] opacity-70">
                {isRefundable ? "مستحق استرداده من الهيئة" : "واجب السداد لهيئة الزكاة"}
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
                مطابقة وفحص القيود المسجلة
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border">
                <span className="text-slate-400 block mb-1">إجمالي مشتريات الأسطول:</span>
                <strong className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                  {amountLabel(data.summary.netPurchases)} ر.س
                </strong>
                <span className="text-[10px] text-slate-400 block mt-1">
                  ضريبة مسجلة: {amountLabel(data.summary.recordedInputVat)} ر.س
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border">
                <span className="text-slate-400 block mb-1">الضريبة غير القابلة للخصم:</span>
                <strong className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                  {amountLabel(data.summary.nonRecoverableInputVat)} ر.س
                </strong>
                <span className="text-[10px] text-slate-400 block mt-1">
                  تُضاف تلقائياً إلى تكلفة المصروف
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border">
                <span className="text-slate-400 block mb-1">فواتير مبدئية مستبعدة:</span>
                <strong className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                  {data.coverage.proformaCount} فاتورة
                </strong>
                <span className="text-[10px] text-slate-400 block mt-1">
                  عروض أسعار لا تدخل في الإقرار
                </span>
              </div>
            </div>

            {/* Warnings list if any */}
            {data.warnings.length > 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <strong className="font-black block">ملاحظات التحقق من القيود:</strong>
                {data.warnings.map((w, idx) => (
                  <p key={idx} className="flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>كافة العمليات والقيود مطابقة للمواصفات الضريبية ولا توجد تنبيهات معلقة.</span>
              </div>
            )}

            {/* 7. Document Drill-down (§14.7) */}
            <details className="mt-4 border-t theme-border pt-4">
              <summary className="cursor-pointer text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline">
                عرض المستندات المؤيدة للإقرار (فواتير المبيعات: {data.sales.length} · فواتير المشتريات: {data.purchases.length})
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
                        {row.number}
                      </Link>
                      <span className="text-slate-500">
                        {
                          {
                            CREDIT: "إشعار دائن (تخفيض)",
                            DEBIT: "إشعار مدين (إضافة)",
                            INVOICE: "فاتورة مبيعات",
                          }[row.kind] || row.kind
                        }
                      </span>
                    </div>
                    <p className="font-mono text-slate-600 dark:text-slate-300">
                      <span>{row.date}</span> · الصافي: <strong>{row.net}</strong> · الضريبة: <strong>{row.vat}</strong> ر.س
                    </p>
                  </div>
                ))}

                {data.purchases.map((row) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 pt-2.5"
                    key={row.id}
                  >
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {row.supplierName} · <span className="font-mono text-slate-500">{row.invoiceNumber}</span>
                    </p>
                    <p className="font-mono text-slate-600 dark:text-slate-300">
                      الصافي: <strong>{row.netAmount}</strong> · ضريبة قابلة للخصم:{" "}
                      <strong className="text-emerald-600 dark:text-emerald-400">{row.recoverableVat}</strong> ر.س
                    </p>
                  </div>
                ))}

                {data.sales.length + data.purchases.length === 0 && (
                  <p className="py-4 text-center text-slate-400">لا توجد مستندات مسجلة ضمن هذه الفترة.</p>
                )}
              </div>
            </details>
          </section>

          {/* Footer note & link */}
          <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-2">
            <p>
              آخر احتساب:{" "}
              {new Date(data.generatedAt).toLocaleString("ar-SA", {
                calendar: "gregory",
                timeZone: "Asia/Riyadh",
              })}
            </p>
            <a
              href="https://zatca.gov.sa/en/eServices/UserManual/Pages/UserManual-009.aspx"
              target="_blank"
              rel="noreferrer"
              className="hover:underline flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold"
            >
              <span>دليل هيئة الزكاة لتقديم الإقرار الإلكتروني</span>
              <ExternalLink className="size-3" />
            </a>
          </footer>
        </>
      )}
    </div>
  );
}
