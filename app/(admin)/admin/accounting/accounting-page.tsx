"use client";
import { useUiText } from "@/lib/ui-text";


import Link from "next/link";
import { useState, useMemo, type FormEvent } from "react";
import { BookOpen, Calculator, Landmark } from "lucide-react";
import AccountingPeriodSelector from "@/app/_components/AccountingPeriodSelector";
import { PageHeader } from "@/app/_components/ui";
import {
  accountingRequest,
  amountLabel,
  defaultReportPeriod,
  downloadAccounting,
  periodBody,
  periodQuery,
  type FinancialReport,
  type ReportPeriod,
} from "@/lib/accounting";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import JournalPanel from "./journal-panel";
import PaymentPanel from "./payment-panel";
import { useLanguage } from "@/lib/languageContext";

interface ClosedPeriod {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  closedAt: string;
}

const INPUT = "theme-input h-11 rounded-xl px-3 text-sm";

function LegacyReview({
  report,
  onChanged,
}: {
  report: FinancialReport;
  onChanged: () => void;
}) {
  const ui = useUiText();

  const [id, setId] = useState("");
  const [settlement, setSettlement] = useState("1103");
  const [revenue, setRevenue] = useState("4101");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function post(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    const r = await accountingRequest(`/sales/${id}/post`, "POST", {
      revenueAccountCode: revenue,
      settlementAccountCode: settlement,
    });
    setSaving(false);
    if (r.success) {
      setId("");
      onChanged();
    } else {
      setError(r.error || "تعذر ترحيل الفاتورة");
    }
  }

  return report.unpostedInvoices.length ? (
    <section className="rounded-2xl border border-amber-300 bg-amber-500/5 p-5">
      <h2 className="font-bold">
        {ui("مستندات حتى نهاية الفترة تحتاج مراجعة محاسبية (")}{ui(report.unpostedInvoices.length)})
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        {ui("الفواتير القديمة تظهر في VAT كما سُجلت، وتحتاج اعتماد حساب التسوية لإدراجها في دفتر الأستاذ، بما يشمل المستندات الأقدم التي تؤثر في الرصيد الافتتاحي. راجع التحصيل الفعلي قبل الترحيل.")}</p>
      <form onSubmit={post} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex-1 text-xs font-bold">
          {ui("الفاتورة")}<select
            required
            className={`${INPUT} mt-2 w-full`}
            value={id}
            onChange={(e) => setId(e.target.value)}
          >
            <option value="">{ui("اختر فاتورة للمراجعة")}</option>
            {report.unpostedInvoices.map((v) => (
              <option key={v.id} value={v.id}>
                {ui(v.number)} · {v.customerName} · {ui(v.invoiceDate.slice(0, 10))}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          {ui("الإيراد")}<select
            className={`${INPUT} mt-2 block`}
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
          >
            <option value="4101">{ui("4101 · النقل")}</option>
            <option value="4102">{ui("4102 · كبار الشخصيات والعمرة")}</option>
          </select>
        </label>
        <label className="text-xs font-bold">
          {ui("تسوية المستند")}<select
            className={`${INPUT} mt-2 block`}
            value={settlement}
            onChange={(e) => setSettlement(e.target.value)}
          >
            <option value="1103">{ui("1103 · ذمم العملاء")}</option>
            <option value="1101">{ui("1101 · نقد مستلم / مسترد")}</option>
            <option value="1102">{ui("1102 · بنك مستلم / مسترد")}</option>
          </select>
        </label>
        <button
          disabled={saving}
          className="gold-gradient-btn rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-40 cursor-pointer"
        >
          {ui("اعتماد ترحيل الفاتورة")}</button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          {ui(error)}
        </p>
      )}
    </section>
  ) : null;
}

function PeriodArchive({
  period,
  report,
  reload,
  onChanged,
}: {
  period: ReportPeriod;
  report: FinancialReport;
  reload: number;
  onChanged: () => void;
}) {
  const ui = useUiText();

  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const closed = useAccountingQuery<{ items: ClosedPeriod[] }>(
    "/periods",
    reload,
  );

  async function close(e: FormEvent) {
    e.preventDefault();
    if (!confirmed) return;
    setSaving(true);
    setError("");
    const r = await accountingRequest("/periods/close", "POST", {
      period: periodBody(period),
      reason,
    });
    setSaving(false);
    if (r.success) {
      setReason("");
      setConfirmed(false);
      onChanged();
    } else {
      setError(r.error || "تعذر إقفال الفترة");
    }
  }

  return (
    <section className="theme-card rounded-2xl border theme-border p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
          {ui("حفظ الفترة ومنع تعديلها (إقفال الفترة)")}</h2>
        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {ui("تُحفظ نسخة ثابتة ومؤرشفة من الإقرار الضريبي وميزان المراجعة وقائمة الأرباح. بعد الإقفال تُمنع القيود والتعديلات وحذف الفواتير حتى تاريخ نهاية الفترة لضمان مطابقة الدفاتر مع إقرارات هيئة الزكاة؛ تُسجل أي تسويات لاحقة في فترة جديدة مفتوحة.")}</p>
      </div>
      <form onSubmit={close} className="mt-5 space-y-4">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border text-xs font-bold text-slate-700 dark:text-slate-300">
          {ui("نطاق الفترة المطلوب إقفالها:")}{ui(" ")}
          <bdi className="font-mono text-amber-700 dark:text-amber-400">
            {ui(report.range.start)}
          </bdi>{ui(" ")}
          {ui("إلى")}{ui(" ")}
          <bdi className="font-mono text-amber-700 dark:text-amber-400">
            {ui(report.range.endInclusive)}
          </bdi>
        </div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {ui("مرجع المراجعة وسبب الإقفال *")}<input
            required
            minLength={5}
            maxLength={300}
            className={`${INPUT} mt-2 w-full`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={ui("مثال: تمت مطابقة السجل والمستندات وتقديم الإقرار الضريبي")}
          />
        </label>
        <label className="flex items-start gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="size-4 accent-amber-600 rounded mt-0.5 cursor-pointer"
          />
          <span>
            {ui("أؤكد مراجعة الفواتير والمصروفات والأرصدة، وأوافق على إقفال هذه الفترة وحفظها ومنع تعديلها لاحقاً.")}</span>
        </label>
        <button
          disabled={saving || !confirmed || report.unpostedInvoices.length > 0}
          className="gold-gradient-btn rounded-xl px-5 py-3 text-xs sm:text-sm font-black disabled:opacity-40 cursor-pointer shadow-sm"
        >
          {ui(saving ? "جارٍ إقفال الفترة…" : "تأكيد إقفال الفترة وحفظ الأرشيف")}
        </button>
      </form>
      {(error || closed.error) && (
        <p role="alert" className="mt-4 text-sm text-rose-600">
          {ui(error || closed.error)}
        </p>
      )}
      <ul className="mt-6 space-y-3">
        {closed.data?.items.map((v) => (
          <li
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t theme-border pt-3 text-sm"
          >
            <div>
              <p>
                <bdi className="font-mono">
                  {ui(v.startDate.slice(0, 10))} — {ui(v.endDate.slice(0, 10))}
                </bdi>
              </p>
              <p className="mt-1 text-xs text-slate-500">{v.reason}</p>
            </div>
            <button
              type="button"
              className="theme-card rounded-lg border theme-border px-3 py-2 text-xs cursor-pointer"
              onClick={() =>
                void downloadAccounting(
                  `/periods/${v.id}`,
                  `miqat-closed-period-${v.startDate.slice(0, 10)}.json`,
                ).catch((e) =>
                  setError(
                    e instanceof Error ? e.message : "تعذر تنزيل الأرشيف",
                  ),
                )
              }
            >
              {ui("تنزيل النسخة المحفوظة")}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AccountingPage() {
  const ui = useUiText();

  const { t, dir, isRTL } = useLanguage();
  const [period, setPeriod] = useState(defaultReportPeriod);
  const [tab, setTab] = useState("REPORTS");
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [seedMessage, setSeedMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  const {
    data,
    isLoading,
    error: failure,
  } = useAccountingQuery<FinancialReport>(
    `/financial-report?${periodQuery(period)}`,
    reload,
  );
  const changed = () => setReload((v) => v + 1);

  async function download(format: "pdf" | "csv") {
    setExporting(true);
    setError("");
    try {
      await downloadAccounting(
        `/exports/${format}?${periodQuery(period)}`,
        `miqat-accounting-${period.year}.${format}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التصدير");
    } finally {
      setExporting(false);
    }
  }

  const accountingHelpGuide = useMemo(() => ({
    title: isRTL ? "دليل القيود المحاسبية والتقارير المالية وسندات القبض والسداد" : "Accounting, Financial Reports & Vouchers Guide",
    summary: isRTL
      ? "المحرك المالي الموحد للشركة: يعرض قائمة الدخل وميزان المراجعة ودفتر الأستاذ العام، مع إدارة قيود اليومية اليدوية والآلية وسندات قبض العملاء وسداد الموردين وإقفال الفترات."
      : "Unified general ledger engine: provides Income Statement, Trial Balance, general ledger books, manual/automated journal entries, customer receipts, supplier payments, and period closing.",
    cards: [
      {
        title: isRTL ? "١. التقارير المالية وميزان المراجعة" : "1. Financial Reports & Trial Balance",
        badge: "REPORTS",
        items: [
          {
            label: isRTL ? "قائمة الدخل وصافي الربح" : "Income Statement & Net Profit",
            description: isRTL
              ? "مقارنة إجمالي إيرادات النقل والعمرة (4000) مقابل التكاليف التشغيلية والإدارية (5000) لاستخراج صافي ربح الفترة."
              : "Compares transport revenues (4000) against operating and administrative expenses (5000) to derive net profit.",
          },
          {
            label: isRTL ? "السيولة والذمم وحسابات الضريبة" : "Cash, AR/AP & VAT Accounts",
            code: "1101–1103 / 2101–2102",
            description: isRTL
              ? "متابعة أرصدة الصندوق والبنك الأهلي SNB، ذمم العملاء غير المحصلة، ذمم الموردين، وأرصدة ضريبة المخرجات والمدخلات."
              : "Tracks cash/bank balances, accounts receivable, accounts payable, and input/output VAT balances.",
          },
        ],
      },
      {
        title: isRTL ? "٢. دفتر اليومية وسندات القبض والسداد" : "2. Journals & Receipt/Payment Vouchers",
        badge: "JOURNALS & PAYMENTS",
        items: [
          {
            label: isRTL ? "قيود اليومية المتوازنة" : "Balanced Double-Entry Journals",
            description: isRTL
              ? "كل قيد يتطلب تساوي إجمالي المدين مع إجمالي الدائن، ويتضمن زر «+ إثبات رأس المال (300,000 ر.س)» الجاهز."
              : "Enforces debits equal credits equation, including one-click paid-in capital booking (300,000 SAR).",
          },
          {
            label: isRTL ? "سندات القبض والسداد" : "Payment & Receipt Vouchers",
            code: "SALE / PURCHASE",
            description: isRTL
              ? "تسجيل تحصيل دفعات الفواتير الآجلة من العملاء (يُخفض 1103 ويزيد 1102/1101) أو سداد فواتير الموردين الآجلة (يُخفض 2101)."
              : "Records customer collections (credits 1103, debits bank/cash) and supplier payments (debits 2101).",
          },
        ],
      },
      {
        title: isRTL ? "٣. إقفال الفترات والتصدير" : "3. Period Closing & Audited Export",
        badge: "PERIODS & EXPORT",
        items: [
          {
            label: isRTL ? "إقفال الفترات المحاسبية" : "Accounting Period Lock",
            description: isRTL
              ? "منع تسجيل أو تعديل أي قيود أو فواتير بتاريخ يقع داخل فترة محاسبية تم إقفالها واعتماد إقرارها الضريبي."
              : "Locks historical periods against modifications once tax returns and audits are finalized.",
          },
          {
            label: isRTL ? "تصدير التقارير PDF و CSV" : "PDF & CSV Export",
            description: isRTL
              ? "تنزيل نسخة رسمية من التقرير المالي أو كشف تفصيلي بصيغة CSV/Excel للمحاسب القانوني والمراجع الخارجي."
              : "Generates official executive PDF reports or raw CSV/Excel dumps for external audit.",
          },
        ],
      },
    ],
    tip: isRTL
      ? "انتقل بين التبويبات الأربع أدناه («التقارير المالية»، «دفتر اليومية»، «القبض والسداد»، «إقفال الفترات») لإدارة كامل الدورة المحاسبية."
      : "Navigate across the 4 tabs below (Reports, Journals, Payments, Period Lock) to manage the entire financial accounting lifecycle.",
    formula: "Total Debits = Total Credits | Assets = Liabilities + Equity + (Revenues − Expenses)",
  }), [isRTL]);

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      {/* Page Header with On-Demand Guide */}
      <PageHeader
        title={ui(t("accounting.title"))}
        subtitle={ui(t("accounting.subtitle"))}
        badge={t("mode.finance")}
        icon={Landmark}
        onRefresh={changed}
        isRefreshing={isLoading}
        helpGuide={accountingHelpGuide}
        onSeeded={(msg) => {
          setError("");
          setSeedMessage(msg);
          changed();
        }}
        onSeedError={(err) => {
          setSeedMessage("");
          setError(err);
        }}
        actions={
          <>
            <Link
              href="/admin/accounts"
              className="theme-card inline-flex items-center gap-1.5 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2 text-xs font-bold transition shadow-2xs text-slate-700 dark:text-slate-200"
            >
              <BookOpen className="size-4 text-amber-500" />
              <span>{ui(t("nav.accounts"))}</span>
            </Link>

            <Link
              href="/admin/vat-returns"
              className="theme-card inline-flex items-center gap-1.5 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2 text-xs font-bold transition shadow-2xs text-slate-700 dark:text-slate-200"
            >
              <Calculator className="size-4 text-amber-500" />
              <span>{ui(t("nav.vatReturns"))}</span>
            </Link>
          </>
        }
      />

      {seedMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400"
        >
          {ui(seedMessage)}
        </p>
      )}

      <nav
        aria-label={ui("صفحات المحاسبة")}
        className="flex flex-wrap gap-2 border-b theme-border pb-4"
      >
        {(
          [
            ["REPORTS", "الأرباح والمصروفات"],
            ["JOURNALS", "دفتر اليومية"],
            ["PAYMENTS", "القبض والدفع"],
            ["PERIODS", "إقفال الفترة"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
              tab === key
                ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950"
                : "theme-card border theme-border hover:border-amber-500/40"
            }`}
          >
            {ui(label)}
          </button>
        ))}
      </nav>

      {(tab === "REPORTS" || tab === "PERIODS") && (
        <section className="theme-card flex flex-wrap items-end justify-between gap-4 rounded-2xl border theme-border p-5">
          <AccountingPeriodSelector value={period} onChange={setPeriod} />
          <div className="flex gap-2">
            <button
              type="button"
              className="theme-card rounded-xl border theme-border hover:border-amber-500 px-4 py-3 text-sm font-bold cursor-pointer"
              onClick={changed}
            >
              {ui(t("common.refresh"))}
            </button>
            {(["pdf", "csv"] as const).map((f) => (
              <button
                key={f}
                type="button"
                disabled={exporting || isLoading || !data}
                onClick={() => void download(f)}
                className="gold-gradient-btn rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-40 cursor-pointer"
              >
                {ui(f === "pdf"
                  ? t("accounting.exportPdf")
                  : t("accounting.exportCsv"))}
              </button>
            ))}
          </div>
        </section>
      )}

      {(error || failure) && (
        <p role="alert" className="theme-card rounded-xl p-4 text-rose-600">
          {ui(error || failure)}
        </p>
      )}

      {tab === "JOURNALS" && (
        <JournalPanel reload={reload} onChanged={changed} />
      )}
      {tab === "PAYMENTS" && (
        <PaymentPanel reload={reload} onChanged={changed} />
      )}

      {(tab === "REPORTS" || tab === "PERIODS") && isLoading && (
        <div
          role="status"
          className="theme-card h-72 animate-pulse rounded-2xl"
        />
      )}

      {data && tab === "PERIODS" && (
        <PeriodArchive
          period={period}
          report={data}
          reload={reload}
          onChanged={changed}
        />
      )}

      {data && tab === "REPORTS" && (
        <>
          <LegacyReview report={data} onChanged={changed} />

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {(
              [
                ["صافي الإيرادات", data.profit.revenue],
                ["المصروفات التشغيلية", data.profit.expenses],
                ["الربح قبل الزكاة / ضريبة الدخل", data.profit.beforeTax],
                ["الربح بعد المصروف الضريبي المسجل", data.profit.afterTax],
              ] as const
            ).map(([label, value], i) => (
              <div
                key={label}
                className={
                  i === 3
                    ? "rounded-2xl bg-slate-900 p-5 text-white"
                    : "theme-card rounded-2xl border theme-border p-5"
                }
              >
                <p
                  className={`text-xs font-bold ${i === 3 ? "text-slate-300" : "text-slate-500"}`}
                >
                  {ui(label)}
                </p>
                <p className="mt-4 font-mono text-2xl font-black" dir="ltr">
                  {ui(amountLabel(value))}{ui(" ")}
                  <span className="text-xs font-normal opacity-60">SAR</span>
                </p>
              </div>
            ))}
          </section>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm leading-relaxed text-amber-900 dark:text-amber-200 space-y-1">
            <strong className="font-black text-slate-900 dark:text-white block">
              {ui("💡 إيضاح مالي هام بشأن حساب الأرباح وضريبة القيمة المضافة:")}</strong>
            <p>
              {ui("ضريبة القيمة المضافة (15%) هي أمانة ضريبية تُحصّل وتُورّد لهيئة الزكاة والضريبة والجمارك، وليست جزءاً من إيرادات المنشأة ولا تُخصم من صافي أرباح التشغيل. صافي أرباح الفترة يُحسب بمقابلة الإيرادات الصافية قبل الضريبة بالمصروفات التشغيلية المباشرة وتكاليف الأسطول والإدارة.")}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
              {ui("مصروف الزكاة / ضريبة الدخل التقديري المسجل:")}{ui(" ")}
              {ui(amountLabel(data.profit.taxExpense))} {ui("ر.س (لا يُحسب تلقائياً من ضريبة القيمة المضافة).")}</p>
          </div>

          <section className="theme-card overflow-hidden rounded-2xl border theme-border">
            <header className="p-5">
              <h2 className="text-lg font-bold">{ui("قائمة الدخل حسب الحساب")}</h2>
            </header>
            <div className="divide-y divide-[var(--border-color)]">
              {data.trial
                .filter(
                  (a) =>
                    ["REVENUE", "EXPENSE"].includes(a.type) &&
                    (Number(a.debit) || Number(a.credit)),
                )
                .map((a) => (
                  <div
                    key={a.code}
                    className="flex justify-between gap-4 border-t theme-border px-5 py-3 text-sm"
                  >
                    <p>
                      <bdi className="font-mono text-slate-500">{ui(a.code)}</bdi> ·{ui(" ")}
                      {(ui.language === "en" && a.nameEn ? a.nameEn : ui(a.nameAr))}
                    </p>
                    <bdi className="font-mono font-bold">
                      {ui(amountLabel(
                        String(
                          a.type === "REVENUE"
                            ? Number(a.credit) - Number(a.debit)
                            : Number(a.debit) - Number(a.credit),
                        ),
                      ))}
                    </bdi>
                  </div>
                ))}
            </div>
          </section>

          <section className="theme-card overflow-hidden rounded-2xl border theme-border">
            <h2 className="p-5 text-lg font-bold">{ui("ميزان المراجعة")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-start text-sm">
                <thead className="theme-card-subtle text-xs text-slate-500">
                  <tr>
                    {[
                      "الحساب",
                      "افتتاحي مدين",
                      "افتتاحي دائن",
                      "حركة مدين",
                      "حركة دائن",
                      "ختامي مدين",
                      "ختامي دائن",
                    ].map((v) => (
                      <th key={v} className="px-4 py-3">
                        {ui(v)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.trial.map((a) => (
                    <tr key={a.code} className="border-t theme-border">
                      <td className="px-4 py-3">
                        <bdi className="font-mono font-bold text-amber-700 dark:text-amber-400">
                          {ui(a.code)}
                        </bdi>{ui(" ")}
                        · {(ui.language === "en" && a.nameEn ? a.nameEn : ui(a.nameAr))}
                      </td>
                      {[
                        a.openingDebit,
                        a.openingCredit,
                        a.debit,
                        a.credit,
                        a.closingDebit,
                        a.closingCredit,
                      ].map((v, i) => (
                        <td className="px-4 py-3 font-mono" key={i}>
                          {ui(amountLabel(v))}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="theme-card-subtle font-bold">
                    <td colSpan={3} className="px-4 py-4">
                      {ui("الإجمالي")}</td>
                    {[
                      data.totals.debit,
                      data.totals.credit,
                      data.totals.closingDebit,
                      data.totals.closingCredit,
                    ].map((v, i) => (
                      <td key={i} className="px-4 py-4 font-mono">
                        {ui(amountLabel(v))}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="theme-card rounded-2xl border theme-border p-5">
            <h2 className="text-lg font-bold">{ui("تكلفة وربحية المركبات")}</h2>
            <p className="mt-2 text-xs text-slate-500">
              {ui("تعتمد على لوحة المركبة المسجلة في الفواتير والمصروفات والقيود. المصروفات العامة غير المخصصة لا توزع تلقائيًا.")}</p>
            {data.vehicles.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[500px] text-start text-sm">
                  <thead>
                    <tr>
                      {["اللوحة", "الإيراد", "التكلفة", "الربح"].map((v) => (
                        <th key={v} className="py-3">
                          {ui(v)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.vehicles.map((v) => (
                      <tr key={v.plate} className="border-t theme-border">
                        {[v.plate, v.revenue, v.cost, v.profit].map((x, i) => (
                          <td key={i} className="py-3 font-mono">
                            {ui(i ? amountLabel(x) : x)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">
                {ui("لا توجد قيود مرتبطة بلوحات مركبات في الفترة.")}</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
