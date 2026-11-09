"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  ReceiptText,
  FileClock,
  ArrowUpLeft,
  ArrowUpRight,
} from "lucide-react";
import { useLanguage } from "@/lib/languageContext";
import type { CaptainInspectionItem } from "@/app/_actions/inspection";
import type { DashboardContractItem, VehicleExpiryAlert } from "@/lib/dashboard-analytics";
import { Badge } from "@/app/_components/ui";

interface ActionCenterProps {
  pendingCaptains: CaptainInspectionItem[];
  expiryAlerts: VehicleExpiryAlert[];
  unpostedInvoicesCount: number;
  pendingContracts: DashboardContractItem[];
  isLoading: boolean;
  hasLoadError?: boolean;
}

export default function ActionCenter({
  pendingCaptains,
  expiryAlerts,
  unpostedInvoicesCount,
  pendingContracts,
  isLoading,
  hasLoadError = false,
}: ActionCenterProps) {
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);
  const Arrow = language === "ar" ? ArrowUpLeft : ArrowUpRight;

  if (isLoading) {
    return (
      <div
        className="h-16 rounded-2xl border theme-border theme-card-subtle animate-pulse"
        aria-label={text("جاري فحص المهام العاجلة", "Checking daily action queue")}
      />
    );
  }

  const hasActions =
    pendingCaptains.length > 0 ||
    expiryAlerts.length > 0 ||
    unpostedInvoicesCount > 0 ||
    pendingContracts.length > 0;

  if (!hasActions) {
    if (hasLoadError) {
      return (
        <section
          aria-labelledby="action-center-partial"
          className="theme-card rounded-2xl border border-amber-500/30 bg-[var(--accent-surface)]/40 px-4 py-3.5 sm:px-5 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="action-center-partial" className="text-sm font-semibold text-slate-900 dark:text-white">
                {text("تعذر التحقق من جميع مؤشرات المتابعة", "Unable to verify all queue indicators")}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {text(
                  "بعض بيانات الفحوصات أو الفواتير أو الأسطول تعذر تحميلها. أعد التحديث قبل اعتماد الجاهزية.",
                  "Some readiness, fleet, or accounting checks failed to load. Refresh the overview before confirming compliance."
                )}
              </p>
            </div>
          </div>
          <Link
            href="/admin/inspections"
            className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline"
          >
            <span>{text("سجل الفحوصات", "Inspections log")}</span>
            <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </section>
      );
    }

    return (
      <section
        aria-labelledby="action-center-clear"
        className="theme-card rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3.5 sm:px-5 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="action-center-clear" className="text-sm font-semibold text-slate-900 dark:text-white">
              {text("التشغيل اليومي مكتمل ومنتظم", "Daily operations & compliance are clear")}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {text(
                "اكتملت فحوصات الكباتن اليومية، ولا توجد فواتير معلقة للترحيل أو وثائق مركبات منتهية.",
                "All captain inspections are recorded and no unposted invoices or expiring fleet documents require urgent action."
              )}
            </p>
          </div>
        </div>
        <Link
          href="/admin/inspections"
          className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline"
        >
          <span>{text("سجل الفحوصات", "Inspections log")}</span>
          <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="action-center-title"
      className="theme-card rounded-2xl border theme-border p-4 sm:p-5 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
          <h2 id="action-center-title" className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
            {text("مهام تحتاج متابعة اليوم", "Needs attention today")}
          </h2>
        </div>
        <Badge variant="warning" className="font-mono">
          {pendingCaptains.length +
            (unpostedInvoicesCount > 0 ? 1 : 0) +
            expiryAlerts.length +
            pendingContracts.length}{" "}
          {text("بنود", "items")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {pendingCaptains.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-[var(--accent-surface)]/50 dark:bg-amber-950/20 p-3.5 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <ClipboardCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {text("كباتن بانتظار الفحص", "Pending inspections")}
                </span>
                <Badge variant="gold" className="font-mono">
                  {pendingCaptains.length}
                </Badge>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-slate-800 dark:text-slate-200">
                {pendingCaptains.slice(0, 3).map((cap) => (
                  <li key={cap.id} className="flex items-center justify-between gap-2 truncate">
                    <span className="truncate font-medium">{cap.name}</span>
                    {cap.assignedVehiclePlate && (
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 shrink-0">
                        <bdi>{cap.assignedVehiclePlate}</bdi>
                      </Badge>
                    )}
                  </li>
                ))}
                {pendingCaptains.length > 3 && (
                  <li className="text-[11px] text-[var(--text-muted)]">
                    +{pendingCaptains.length - 3} {text("آخرون", "more")}
                  </li>
                )}
              </ul>
            </div>
            <Link
              href="/admin/inspections"
              className="inline-flex items-center gap-1 min-h-11 md:min-h-0 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline"
            >
              <span>{text("اعتماد أو متابعة الفحص", "Review inspections")}</span>
              <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}

        {unpostedInvoicesCount > 0 && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300">
                  <ReceiptText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {text("فواتير غير مرحّلة", "Unposted invoices")}
                </span>
                <Badge variant="outline" className="font-mono">
                  {unpostedInvoicesCount}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
                {text(
                  "فواتير معتمدة بانتظار الترحيل إلى دفتر الأستاذ العام وإثبات الإيراد.",
                  "Approved sales invoices awaiting general ledger revenue posting."
                )}
              </p>
            </div>
            <Link
              href="/admin/accounting"
              className="inline-flex items-center gap-1 min-h-11 md:min-h-0 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline"
            >
              <span>{text("الترحيل في المحاسبة", "Post in accounting")}</span>
              <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}

        {expiryAlerts.length > 0 && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300">
                  <FileWarning className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {text("انتهاء وثائق الأسطول", "Fleet document expiry")}
                </span>
                <Badge variant="destructive" className="font-mono">
                  {expiryAlerts.length}
                </Badge>
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {expiryAlerts.slice(0, 3).map((item) => (
                  <li
                    key={`${item.vehicleId}-${item.document}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate font-medium text-slate-900 dark:text-white">
                      <bdi>{item.plateNumberAr || item.plateNumberEn}</bdi> ·{" "}
                      {item.document === "registration"
                        ? text("الاستمارة", "Reg.")
                        : text("التأمين", "Ins.")}
                    </span>
                    <span
                      className={`font-mono text-[11px] font-semibold shrink-0 ${
                        item.daysRemaining < 0
                          ? "text-rose-700 dark:text-rose-400"
                          : "text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      {item.daysRemaining < 0
                        ? text(`منتهٍ منذ ${Math.abs(item.daysRemaining)} ي`, `${Math.abs(item.daysRemaining)}d ago`)
                        : item.daysRemaining === 0
                          ? text("اليوم", "Today")
                          : text(`خلال ${item.daysRemaining} ي`, `in ${item.daysRemaining}d`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/admin/fleet"
              className="inline-flex items-center gap-1 min-h-11 md:min-h-0 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline"
            >
              <span>{text("تحديث بيانات الأسطول", "Manage fleet")}</span>
              <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}

        {pendingContracts.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-[var(--bg-card-subtle)] p-3.5 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                  <FileClock className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                  {text("عقود بانتظار الاعتماد", "Contracts awaiting review")}
                </span>
                <Badge variant="gold" className="font-mono">
                  {pendingContracts.length}
                </Badge>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-slate-800 dark:text-slate-200">
                {pendingContracts.slice(0, 3).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/admin/contracts/${c.id}`}
                      className="font-mono font-semibold text-amber-800 dark:text-amber-300 hover:underline"
                    >
                      <bdi>{c.referenceNumber}</bdi>
                    </Link>
                    <span className="truncate text-[var(--text-muted)]">{c.customerName}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/admin/contracts"
              className="inline-flex items-center gap-1 min-h-11 md:min-h-0 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline"
            >
              <span>{text("مراجعة العقود", "Review contracts")}</span>
              <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
