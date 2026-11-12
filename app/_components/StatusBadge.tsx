"use client";
import { useUiText } from "@/lib/ui-text";




type StatusType = "vehicle" | "operation" | "captain" | "inspection";

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_MAP: Record<StatusType, Record<string, StatusConfig>> = {
  vehicle: {
    AVAILABLE: { label: "جاهزة", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/30" },
    ON_TRIP: { label: "في رحلة", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-600/30" },
    MAINTENANCE: { label: "صيانة", className: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-600/30" },
  },
  operation: {
    AIRPORT_TRANSFER: { label: "توصيل مطار", className: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-600/30" },
    CITY_TOUR: { label: "جولة سياحية", className: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-600/30" },
    INTERCITY: { label: "بين المدن", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-600/30" },
    HAJJ_UMRAH: { label: "حج وعمرة", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/30" },
    "توصيل واستقبال مطار": { label: "توصيل مطار", className: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-600/30" },
    "جولة سياحية وزيارات": { label: "جولة سياحية", className: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-600/30" },
    "نقل بين المدن والمحافظات": { label: "بين المدن", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-600/30" },
    "خدمات الحج والعمرة وزيارة المشاعر": { label: "حج وعمرة", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/30" },
    "خدمة بالساعة / تأجير بسائق": { label: "بالساعة", className: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-600/30" },
    "نقل وفود وفعاليات ومؤتمرات": { label: "وفود وفعاليات", className: "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-600/30" },
    "توصيل محطات قطار الحرمين": { label: "قطار الحرمين", className: "bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-600/30" },
    "رحلة خاصة VIP": { label: "رحلة VIP", className: "bg-[var(--accent-surface)] text-[var(--accent-gold)] border-[var(--accent-gold)]/35" },
    "خدمة يوم كامل": { label: "يوم كامل", className: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-600/30" },
  },
  captain: {
    ACTIVE: { label: "نشط", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/30" },
    INACTIVE: { label: "معطل", className: "bg-[var(--bg-card-subtle)] text-[var(--text-muted)] border-[var(--control-border)]/45" },
    INSPECTED: { label: "تم الفحص اليوم", className: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-600/30" },
    PENDING_INSPECTION: { label: "بانتظار الفحص", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-600/30" },
  },
  inspection: {
    APPROVED: { label: "معتمد", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/30" },
    COMPLETED: { label: "مكتمل", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/30" },
    REJECTED: { label: "مرفوض", className: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-600/30" },
  },
};

interface StatusBadgeProps {
  type: StatusType;
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ type, status, size = "sm" }: StatusBadgeProps) {
  const ui = useUiText();

  const config = STATUS_MAP[type]?.[status];
  if (!config) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--bg-card-subtle)] text-[var(--text-main)] border theme-border">
        {ui(status)}
      </span>
    );
  }

  const sizeClass = size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-xs";

  return (
    <span className={`${sizeClass} rounded-full font-bold border inline-flex items-center gap-1 ${config.className}`}>
      {ui(config.label)}
    </span>
  );
}
