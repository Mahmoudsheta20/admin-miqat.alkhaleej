"use client";
import { useUiText } from "@/lib/ui-text";




type StatusType = "vehicle" | "operation" | "captain" | "inspection";

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_MAP: Record<StatusType, Record<string, StatusConfig>> = {
  vehicle: {
    AVAILABLE: { label: "جاهزة", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
    ON_TRIP: { label: "في رحلة", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
    MAINTENANCE: { label: "صيانة", className: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30" },
  },
  operation: {
    AIRPORT_TRANSFER: { label: "توصيل مطار", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
    CITY_TOUR: { label: "جولة سياحية", className: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
    INTERCITY: { label: "بين المدن", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
    HAJJ_UMRAH: { label: "حج وعمرة", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  },
  captain: {
    ACTIVE: { label: "نشط", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
    INACTIVE: { label: "معطل", className: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30" },
    INSPECTED: { label: "تم الفحص اليوم", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
    PENDING_INSPECTION: { label: "بانتظار الفحص", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  },
  inspection: {
    APPROVED: { label: "معتمد", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
    COMPLETED: { label: "مكتمل", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
    REJECTED: { label: "مرفوض", className: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30" },
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
      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-700 text-[var(--text-muted)] dark:text-slate-300 border border-slate-300 dark:border-slate-600">
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
