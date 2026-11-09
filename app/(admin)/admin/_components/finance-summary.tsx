"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, Wallet, ArrowUpLeft, ArrowUpRight, AlertCircle } from "lucide-react";
import { useApiQuery } from "@/lib/use-api-query";
import { currentSaudiPeriod, type FinancialReport } from "@/lib/accounting";
import { summarizeProfit, signedMoneyMinor } from "@/lib/dashboard-analytics";
import { useLanguage } from "@/lib/languageContext";
import Money from "@/app/_components/ui/Money";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui";
import LoadError from "@/app/_components/LoadError";

export interface FinanceSummaryProps {
  purchasesTotal?: string;
  purchasesCount?: number;
  invoicesCount?: number;
  revision?: number;
}

export default function FinanceSummary({
  purchasesTotal,
  purchasesCount,
  invoicesCount,
  revision = 0,
}: FinanceSummaryProps) {
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);
  const Arrow = language === "ar" ? ArrowUpLeft : ArrowUpRight;

  const period = currentSaudiPeriod();
  const [periodMode, setPeriodMode] = useState<"QUARTER" | "YEAR">("QUARTER");
  const [chartTab, setChartTab] = useState<"overview" | "vehicles">("overview");

  const queryPath =
    periodMode === "QUARTER"
      ? `/accounting/financial-report?mode=QUARTER&year=${period.year}&quarter=${period.quarter}`
      : `/accounting/financial-report?mode=YEAR&year=${period.year}`;

  const report = useApiQuery<FinancialReport>(queryPath, revision);

  const profitStats = report.data ? summarizeProfit(report.data.profit) : null;
  const maxFinancialBar = profitStats
    ? [
        profitStats.revenueMinor,
        profitStats.expensesMinor,
        profitStats.afterTaxMinor < BigInt(0) ? -profitStats.afterTaxMinor : profitStats.afterTaxMinor,
      ].reduce((m, val) => (val > m ? val : m), BigInt(0))
    : BigInt(0);

  function ratioPercent(val: bigint, ceiling: bigint): number {
    if (ceiling <= BigInt(0)) return 0;
    const abs = val < BigInt(0) ? -val : val;
    if (abs === BigInt(0)) return 0;
    return Math.max(4, Math.min(100, Number((abs * BigInt(100)) / ceiling)));
  }

  const vehiclesSorted = report.data
    ? [...report.data.vehicles]
        .sort((a, b) => {
          const magA = signedMoneyMinor(a.revenue) + signedMoneyMinor(a.cost);
          const magB = signedMoneyMinor(b.revenue) + signedMoneyMinor(b.cost);
          return magB > magA ? 1 : magB < magA ? -1 : 0;
        })
        .slice(0, 6)
    : [];

  const maxVehicleAmount = vehiclesSorted.reduce((max, row) => {
    const rev = signedMoneyMinor(row.revenue);
    const cost = signedMoneyMinor(row.cost);
    const localMax = rev > cost ? rev : cost;
    return localMax > max ? localMax : max;
  }, BigInt(0));

  return (
    <Card className="theme-card border theme-border shadow-none">
      <CardHeader className="p-4 sm:p-5 border-b theme-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                  {text("الملخص المالي والأرباح", "Financial summary & profitability")}
                </CardTitle>
                {profitStats && (
                  <Badge
                    variant={profitStats.afterTaxMinor >= BigInt(0) ? "success" : "destructive"}
                    className="font-mono text-[11px]"
                  >
                    <bdi>
                      {text("هامش الربح", "Margin")}: {profitStats.marginPercent}%
                    </bdi>
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-[var(--text-muted)] mt-0.5">
                {periodMode === "QUARTER"
                  ? `${text("الربع الحالي · الحركات المرحّلة", "Current quarter · Posted entries")} · Q${period.quarter} / ${period.year}`
                  : `${text("السنة المالية الحالية · الحركات المرحّلة", "Full year · Posted entries")} · ${period.year}`}
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className="inline-flex rounded-lg border theme-border bg-[var(--bg-card-subtle)] p-1 gap-1"
              role="group"
              aria-label={text("فترة التقرير المالي", "Financial report period")}
            >
              {([
                { id: "QUARTER", label: text("الربع الحالي", "Quarter") },
                { id: "YEAR", label: text("السنة كاملة", "Full year") },
              ] as const).map((item) => {
                const active = periodMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPeriodMode(item.id)}
                    className={`min-h-11 sm:min-h-9 px-3 rounded-md text-xs font-semibold transition cursor-pointer ${
                      active
                        ? "bg-[var(--bg-card)] text-amber-800 dark:text-amber-300 border theme-border"
                        : "text-[var(--text-muted)] hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <Link
              className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-lg border theme-border bg-[var(--bg-card-subtle)] text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300 hover:border-amber-500/40 transition"
              href="/admin/accounting"
            >
              <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{text("فتح المحاسبة", "Open accounting")}</span>
              <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        <LoadError message={report.error} onRetry={report.refetch} />

        {report.isLoading ? (
          <div
            className="h-36 animate-pulse rounded-xl theme-card-subtle"
            aria-label={text("جاري تحميل الملخص المالي", "Loading financial summary")}
          />
        ) : (
          report.data &&
          profitStats && (
            <>
              {/* 4 KPI Summary Cards */}
              <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5">
                  <dt className="text-xs font-medium text-[var(--text-muted)]">
                    {text("الإيرادات", "Revenue")}
                  </dt>
                  <dd className="mt-1.5">
                    <Money amount={report.data.profit.revenue} size="lg" color="emerald" />
                  </dd>
                </div>

                <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5">
                  <dt className="text-xs font-medium text-[var(--text-muted)]">
                    {text("المصروفات التشغيلية", "Operating expenses")}
                  </dt>
                  <dd className="mt-1.5">
                    <Money amount={report.data.profit.expenses} size="lg" color="rose" />
                  </dd>
                </div>

                <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5">
                  <dt className="text-xs font-medium text-[var(--text-muted)]">
                    {text("صافي الربح بعد الضريبة", "Profit after tax")}
                  </dt>
                  <dd className="mt-1.5">
                    <Money
                      amount={report.data.profit.afterTax}
                      size="lg"
                      color={profitStats.afterTaxMinor >= BigInt(0) ? "default" : "rose"}
                    />
                  </dd>
                </div>

                <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5">
                  <dt className="text-xs font-medium text-[var(--text-muted)]">
                    {purchasesTotal
                      ? text("مشتريات ومستندات", "Purchases & vouchers")
                      : text("الربح قبل الضريبة", "Profit before tax")}
                  </dt>
                  <dd className="mt-1.5 flex items-baseline justify-between gap-2">
                    {purchasesTotal ? (
                      <Money amount={purchasesTotal} size="lg" />
                    ) : (
                      <Money
                        amount={report.data.profit.beforeTax}
                        size="lg"
                        color={signedMoneyMinor(report.data.profit.beforeTax) >= BigInt(0) ? "default" : "rose"}
                      />
                    )}
                    {typeof purchasesCount === "number" ? (
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        {purchasesCount} {text("قيد", "rec")}
                      </span>
                    ) : typeof invoicesCount === "number" ? (
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        {invoicesCount} {text("فاتورة", "inv")}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>

              {/* Interactive Financial Visual Chart */}
              <div className="rounded-xl border theme-border p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div
                    className="inline-flex rounded-lg border theme-border bg-[var(--bg-card-subtle)] p-1 gap-1"
                    role="group"
                    aria-label={text("عرض الرسم المالي", "Financial chart view")}
                  >
                    <button
                      type="button"
                      aria-pressed={chartTab === "overview"}
                      onClick={() => setChartTab("overview")}
                      className={`min-h-11 sm:min-h-9 px-3 rounded-md text-xs font-semibold transition cursor-pointer ${
                        chartTab === "overview"
                          ? "bg-[var(--bg-card)] text-amber-800 dark:text-amber-300 border theme-border"
                          : "text-[var(--text-muted)] hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {text("مقارنة الإيرادات والمصروفات", "Revenue vs Expenses")}
                    </button>
                    <button
                      type="button"
                      aria-pressed={chartTab === "vehicles"}
                      onClick={() => setChartTab("vehicles")}
                      className={`min-h-11 sm:min-h-9 px-3 rounded-md text-xs font-semibold transition cursor-pointer ${
                        chartTab === "vehicles"
                          ? "bg-[var(--bg-card)] text-amber-800 dark:text-amber-300 border theme-border"
                          : "text-[var(--text-muted)] hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {text("ربحية المركبات", "Vehicle P&L")} ({report.data.vehicles.length})
                    </button>
                  </div>

                  <span className="text-xs text-[var(--text-muted)] font-mono">
                    <bdi dir="ltr">{report.data.range.start} → {report.data.range.endInclusive}</bdi>
                  </span>
                </div>

                {chartTab === "overview" ? (
                  <div className="space-y-3" aria-label={text("مخطط الأداء المالي", "Financial comparison bars")}>
                    {[
                      {
                        label: text("إجمالي الإيرادات", "Total revenue"),
                        amount: report.data.profit.revenue,
                        pct: ratioPercent(profitStats.revenueMinor, maxFinancialBar),
                        bar: "bg-emerald-600 dark:bg-emerald-400",
                      },
                      {
                        label: text("إجمالي المصروفات", "Total expenses"),
                        amount: report.data.profit.expenses,
                        pct: ratioPercent(profitStats.expensesMinor, maxFinancialBar),
                        bar: "bg-rose-600 dark:bg-rose-400",
                      },
                      {
                        label: text("صافي الربح بعد الضريبة", "Net profit after tax"),
                        amount: report.data.profit.afterTax,
                        pct: ratioPercent(profitStats.afterTaxMinor, maxFinancialBar),
                        bar:
                          profitStats.afterTaxMinor >= BigInt(0)
                            ? "bg-amber-700 dark:bg-amber-400"
                            : "bg-rose-700 dark:bg-rose-400",
                      },
                    ].map((row) => (
                      <div key={row.label} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {row.label}
                          </span>
                          <Money amount={row.amount} size="sm" />
                        </div>
                        <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${row.pct}%` }}
                            className={`h-full rounded-full transition-all duration-300 ${row.bar}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : vehiclesSorted.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                    {text(
                      "لا توجد قيود محاسبية مرتبطة بلوحات المركبات خلال هذه الفترة بعد.",
                      "No posted revenue or expense entries tagged to vehicle plates in this period yet."
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vehiclesSorted.map((veh) => {
                      const rev = signedMoneyMinor(veh.revenue);
                      const cost = signedMoneyMinor(veh.cost);
                      const net = signedMoneyMinor(veh.profit);
                      return (
                        <div key={veh.plate} className="space-y-1.5 border-b last:border-0 theme-border pb-2.5 last:pb-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <Badge variant="outline" className="font-mono text-xs">
                              <bdi>{veh.plate}</bdi>
                            </Badge>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-[var(--text-muted)]">
                                {text("إيراد:", "Rev:")} <Money amount={veh.revenue} size="xs" color="emerald" />
                              </span>
                              <span className="text-[var(--text-muted)]">
                                {text("تكلفة:", "Cost:")} <Money amount={veh.cost} size="xs" color="rose" />
                              </span>
                              <span className="text-[var(--text-muted)]">
                                {text("صافي:", "Net:")}{" "}
                                <Money
                                  amount={veh.profit}
                                  size="xs"
                                  color={net >= BigInt(0) ? "default" : "rose"}
                                />
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                style={{ width: `${ratioPercent(rev, maxVehicleAmount)}%` }}
                                className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                              />
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                style={{ width: `${ratioPercent(cost, maxVehicleAmount)}%` }}
                                className="h-full rounded-full bg-rose-600 dark:bg-rose-400"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {report.data.unpostedInvoices.length > 0 && (
                <Link
                  href="/admin/accounting"
                  className="flex flex-wrap items-center justify-between gap-2 min-h-11 rounded-xl border border-amber-500/30 bg-[var(--accent-surface)]/40 px-4 py-3 text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300 hover:underline"
                >
                  <span className="inline-flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {text("فواتير تحتاج إلى الترحيل في دفتر الأستاذ", "Invoices awaiting general ledger posting")}:{" "}
                    <bdi className="font-mono">{report.data.unpostedInvoices.length}</bdi>
                  </span>
                  <Arrow className="w-4 h-4 shrink-0" aria-hidden="true" />
                </Link>
              )}
            </>
          )
        )}
      </CardContent>
    </Card>
  );
}
