"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, PieChart, ClipboardCheck, Car, ArrowUpLeft, ArrowUpRight, Users } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";
import type {
  DailyContractPoint,
  FleetAnalytics,
  OperationBreakdownItem,
} from "@/lib/dashboard-analytics";
import type { OperationType } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@/app/_components/ui";

interface ContractsActivityChartProps {
  points7: DailyContractPoint[];
  points14: DailyContractPoint[];
  todayContracts: number;
  todayPassengers: number;
  isLoading: boolean;
}

export function ContractsActivityChart({
  points7,
  points14,
  todayContracts,
  todayPassengers,
  isLoading,
}: ContractsActivityChartProps) {
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);
  const [windowDays, setWindowDays] = useState<7 | 14>(7);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const series = windowDays === 7 ? points7 : points14;
  const maxContracts = Math.max(1, ...series.map((p) => p.contracts));
  const totalContracts = series.reduce((sum, p) => sum + p.contracts, 0);
  const totalPassengers = series.reduce((sum, p) => sum + p.passengers, 0);
  const focusedPoint =
    activeIndex !== null && series[activeIndex]
      ? series[activeIndex]
      : series[series.length - 1] ?? null;

  return (
    <Card className="theme-card border theme-border shadow-none h-full flex flex-col">
      <CardHeader className="p-4 sm:p-5 border-b theme-border">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                {text("حركة العقود والرحلات", "Trips & contracts activity")}
              </CardTitle>
              <CardDescription className="text-xs text-[var(--text-muted)] mt-0.5">
                {text(
                  "التوزيع اليومي للعقود وعدد الركاب وفق تاريخ الرحلة",
                  "Daily contract volume and passenger count by scheduled trip date"
                )}
              </CardDescription>
            </div>
          </div>

          <div
            className="inline-flex rounded-lg border theme-border bg-[var(--bg-card-subtle)] p-1 gap-1"
            role="group"
            aria-label={text("نطاق الرسم البياني", "Chart range")}
          >
            {([7, 14] as const).map((days) => {
              const active = windowDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setWindowDays(days);
                    setActiveIndex(null);
                  }}
                  className={`min-h-11 sm:min-h-9 px-3 rounded-md text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-[var(--bg-card)] text-amber-800 dark:text-amber-300 border theme-border"
                      : "text-[var(--text-muted)] hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {days === 7 ? text("7 أيام", "7d") : text("14 يوم", "14d")}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        {isLoading ? (
          <div
            className="h-48 rounded-xl theme-card-subtle animate-pulse"
            aria-label={text("جاري تحميل الرسم البياني", "Loading chart")}
          />
        ) : (
          <>
            {/* Top summary strip */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 text-start">
              <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-2.5 py-2 sm:px-3 sm:py-2.5 min-w-0">
                <span className="block text-[11px] font-medium text-[var(--text-muted)] truncate">
                  {text("إجمالي الفترة", "Window total")}
                </span>
                <strong className="mt-0.5 block text-base sm:text-lg font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  {totalContracts}
                </strong>
              </div>
              <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-2.5 py-2 sm:px-3 sm:py-2.5 min-w-0">
                <span className="block text-[11px] font-medium text-[var(--text-muted)] truncate">
                  {text("رحلات اليوم", "Today trips")}
                </span>
                <strong className="mt-0.5 block text-base sm:text-lg font-mono font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                  {todayContracts}
                </strong>
              </div>
              <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-2.5 py-2 sm:px-3 sm:py-2.5 min-w-0">
                <span className="block text-[11px] font-medium text-[var(--text-muted)] truncate">
                  {text("الركاب", "Passengers")}
                </span>
                <strong className="mt-0.5 flex flex-wrap items-baseline gap-1 text-base sm:text-lg font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  <span>{totalPassengers}</span>
                  <span className="text-[10px] sm:text-[11px] font-sans font-normal text-[var(--text-muted)]">
                    ({todayPassengers} {text("اليوم", "today")})
                  </span>
                </strong>
              </div>
            </div>

            {/* Interactive Responsive Column Chart (horizontally scrollable for 14d on narrow phones) */}
            <div
              className="relative rounded-xl border theme-border bg-[var(--bg-main)]/60 dark:bg-[var(--bg-card-subtle)] p-3 sm:p-4"
              aria-label={text("مخطط الأعمدة اليومي للعقود", "Daily contracts bar chart")}
            >
              <div className="overflow-x-auto no-scrollbar touch-pan-x touch-pan-y">
                {/* Horizontal dashed grid lines */}
                <div
                  className={`relative h-40 flex items-end gap-1.5 sm:gap-2 ${
                    windowDays === 14 ? "min-w-[520px] sm:min-w-0" : "min-w-[290px] sm:min-w-0"
                  }`}
                >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 bottom-7 flex flex-col justify-between"
                >
                  {[0, 1, 2].map((line) => (
                    <div
                      key={line}
                      className="w-full border-b border-dashed border-slate-200 dark:border-slate-800/80"
                    />
                  ))}
                </div>

                {series.map((point, index) => {
                  const pct =
                    point.contracts > 0
                      ? Math.max(12, Math.round((point.contracts / maxContracts) * 100))
                      : 4;
                  const isToday = index === series.length - 1;
                  const isSelected = activeIndex === index || (activeIndex === null && isToday);
                  const showXLabel =
                    windowDays === 7 || index === 0 || index === series.length - 1 || index % 3 === 0;

                  return (
                    <button
                      key={point.date}
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onFocus={() => setActiveIndex(index)}
                      onClick={() => setActiveIndex(index)}
                      aria-label={`${point.date}: ${point.contracts} ${text("عقود", "contracts")}, ${point.passengers} ${text("ركاب", "passengers")}`}
                      className="group relative z-10 flex-1 h-full flex flex-col justify-end items-center gap-1.5 min-w-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-gold)] rounded-md"
                    >
                      <span
                        className={`text-[10px] font-mono tabular-nums font-semibold transition-opacity ${
                          point.contracts > 0
                            ? isSelected
                              ? "text-amber-800 dark:text-amber-300 opacity-100"
                              : "text-[var(--text-muted)] opacity-85"
                            : "text-transparent"
                        }`}
                      >
                        {point.contracts}
                      </span>

                      <div className="w-full flex-1 flex items-end justify-center px-0.5">
                        <div
                          style={{ height: `${pct}%` }}
                          className={`w-full max-w-[34px] rounded-t-md transition-all duration-200 ${
                            point.contracts === 0
                              ? "bg-slate-200/70 dark:bg-slate-800/70"
                              : isSelected
                                ? "bg-amber-700 dark:bg-amber-400"
                                : "bg-amber-600/45 dark:bg-amber-400/35 group-hover:bg-amber-700/80 dark:group-hover:bg-amber-400/75"
                          }`}
                        />
                      </div>

                      <span
                        className={`text-[10px] font-mono tabular-nums truncate max-w-full ${
                          showXLabel
                            ? isSelected
                              ? "text-slate-900 dark:text-white font-semibold"
                              : "text-[var(--text-muted)]"
                            : "opacity-0 select-none"
                        }`}
                      >
                        {point.date.slice(5)}
                      </span>
                    </button>
                  );
                })}
                </div>
              </div>

              {/* Active day readout footer */}
              {focusedPoint && (
                <div className="mt-3 pt-2.5 border-t theme-border flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-xs bg-amber-700 dark:bg-amber-400" aria-hidden="true" />
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {focusedPoint.label}
                    </span>
                    <span className="font-mono text-[var(--text-muted)]" dir="ltr">
                      <bdi>({focusedPoint.date})</bdi>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[var(--text-muted)]">
                    <span>
                      <strong className="font-mono text-slate-900 dark:text-white">
                        {focusedPoint.contracts}
                      </strong>{" "}
                      {text("عقود / رحلات", "contracts")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" aria-hidden="true" />
                      <strong className="font-mono text-slate-900 dark:text-white">
                        {focusedPoint.passengers}
                      </strong>{" "}
                      {text("ركاب", "passengers")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface OperationsMixCardProps {
  inspectedToday: number;
  totalCaptains: number;
  pendingToday: number;
  totalInspections: number;
  fleet: FleetAnalytics;
  operations: OperationBreakdownItem[];
  isLoading: boolean;
}

function RadialGauge({
  percent,
  colorClass,
  label,
}: {
  percent: number;
  colorClass: string;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative w-20 h-20 shrink-0" role="img" aria-label={label}>
      <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          strokeWidth="7"
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={colorClass}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-white">
          <bdi>{clamped}%</bdi>
        </span>
      </div>
    </div>
  );
}

export function OperationsMixCard({
  inspectedToday,
  totalCaptains,
  pendingToday,
  totalInspections,
  fleet,
  operations,
  isLoading,
}: OperationsMixCardProps) {
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);
  const Arrow = language === "ar" ? ArrowUpLeft : ArrowUpRight;

  const inspectionRate =
    totalCaptains > 0 ? Math.round((inspectedToday / totalCaptains) * 100) : 0;
  const fleetReadyRate =
    fleet.total > 0 ? Math.round((fleet.available / fleet.total) * 100) : 0;

  const operationMeta: Record<OperationType, { label: string; bar: string }> = {
    AIRPORT_TRANSFER: {
      label: text("نقل مطار", "Airport transfer"),
      bar: "bg-amber-700 dark:bg-amber-400",
    },
    CITY_TOUR: {
      label: text("جولة داخل المدينة", "City tour"),
      bar: "bg-sky-700 dark:bg-sky-400",
    },
    INTERCITY: {
      label: text("بين المدن", "Intercity"),
      bar: "bg-emerald-700 dark:bg-emerald-400",
    },
    HAJJ_UMRAH: {
      label: text("حج وعمرة", "Hajj & Umrah"),
      bar: "bg-indigo-700 dark:bg-indigo-400",
    },
  };

  return (
    <Card className="theme-card border theme-border shadow-none h-full flex flex-col">
      <CardHeader className="p-4 sm:p-5 border-b theme-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] flex items-center justify-center shrink-0">
              <PieChart className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                {text("مؤشرات الجاهزية والعمليات", "Readiness & operations mix")}
              </CardTitle>
              <CardDescription className="text-xs text-[var(--text-muted)] mt-0.5">
                {text(
                  "الفحص اليومي والأسطول وتوزيع أنواع التشغيل",
                  "Daily safety check rate, fleet status, and trip mix"
                )}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        {isLoading ? (
          <div
            className="h-48 rounded-xl theme-card-subtle animate-pulse"
            aria-label={text("جاري تحميل مؤشرات الجاهزية", "Loading readiness charts")}
          />
        ) : (
          <>
            {/* Dual Radial Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                    <ClipboardCheck className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                    <span>{text("فحص الكباتن", "Captain checks")}</span>
                  </span>
                  <Link
                    href="/admin/inspections"
                    className="inline-flex items-center gap-1 min-h-11 sm:min-h-0 px-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:underline shrink-0"
                  >
                    <span>{text("مراجعة", "Review")}</span>
                    <Arrow className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <RadialGauge
                    percent={inspectionRate}
                    colorClass={
                      pendingToday === 0
                        ? "stroke-emerald-600 dark:stroke-emerald-400"
                        : "stroke-amber-600 dark:stroke-amber-400"
                    }
                    label={`${text("نسبة فحص اليوم", "Today inspection rate")}: ${inspectionRate}%`}
                  />
                  <div className="min-w-0 flex-1 space-y-1 text-xs">
                    <div className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {inspectedToday}/{totalCaptains}{" "}
                      <span className="font-sans font-normal text-[var(--text-muted)]">
                        {text("مكتمل", "ready")}
                      </span>
                    </div>
                    <div
                      className={
                        pendingToday > 0
                          ? "text-amber-800 dark:text-amber-300 font-semibold tabular-nums"
                          : "text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums"
                      }
                    >
                      {pendingToday} {text("بانتظار الفحص", "pending")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                    <Car className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                    <span>{text("توفر الأسطول", "Fleet ready")}</span>
                  </span>
                  <Link
                    href="/admin/fleet"
                    className="inline-flex items-center gap-1 min-h-11 sm:min-h-0 px-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:underline shrink-0"
                  >
                    <span>
                      {fleet.totalSeats} {text("مقعد", "seats")}
                    </span>
                    <Arrow className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <RadialGauge
                    percent={fleetReadyRate}
                    colorClass="stroke-amber-600 dark:stroke-amber-400"
                    label={`${text("جاهزية الأسطول", "Fleet availability")}: ${fleetReadyRate}%`}
                  />
                  <div className="min-w-0 flex-1 space-y-1 text-xs tabular-nums">
                    <div className="font-mono font-semibold text-slate-900 dark:text-white">
                      {fleet.available}/{fleet.total}{" "}
                      <span className="font-sans font-normal text-[var(--text-muted)]">
                        {text("متاح", "avail")}
                      </span>
                    </div>
                    <div className="text-[var(--text-muted)]">
                      {fleet.onTrip} {text("رحلة", "on trip")} · {fleet.maintenance} {text("صيانة", "maint")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Operation Type Horizontal Distribution */}
            <div className="space-y-2.5 rounded-xl border theme-border p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {text("توزيع أنواع الرحلات", "Operations mix")}
                </span>
                <Badge variant="outline" className="text-[11px] font-mono tabular-nums">
                  {totalInspections} {text("فحص مسجل", "total inspections")}
                </Badge>
              </div>
              <div className="space-y-2">
                {operations.map((item) => {
                  const meta = operationMeta[item.type];
                  return (
                    <div key={item.type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-800 dark:text-slate-200 font-medium">
                          {meta.label}
                        </span>
                        <span className="font-mono tabular-nums text-[var(--text-muted)]">
                          <strong className="text-slate-900 dark:text-white">{item.count}</strong>{" "}
                          ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          style={{ width: `${item.count > 0 ? Math.max(4, item.percentage) : 0}%` }}
                          className={`h-full rounded-full ${meta.bar}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
