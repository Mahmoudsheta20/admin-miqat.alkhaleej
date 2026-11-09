"use client";
import { useUiText } from "@/lib/ui-text";


import React from "react";
import { LucideIcon } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon?: LucideIcon;
  variant?: "amber" | "emerald" | "blue" | "purple" | "rose" | "default";
  isActive?: boolean;
  onClick?: () => void;
  isLoading?: boolean;
}

const VARIANT_STYLES = {
  default: {
    iconBg: "bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] dark:text-slate-300",
    textVal: "text-slate-900 dark:text-white",
    activeBorder: "border-slate-500/40 ring-1 ring-slate-500/30",
  },
  amber: {
    iconBg: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    textVal: "text-amber-700 dark:text-amber-400",
    activeBorder: "bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/30",
  },
  emerald: {
    iconBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    textVal: "text-emerald-700 dark:text-emerald-400",
    activeBorder: "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30",
  },
  blue: {
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    textVal: "text-blue-600 dark:text-blue-400",
    activeBorder: "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30",
  },
  purple: {
    iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    textVal: "text-purple-600 dark:text-purple-400",
    activeBorder: "bg-purple-500/10 border-purple-500/40 ring-1 ring-purple-500/30",
  },
  rose: {
    iconBg: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    textVal: "text-rose-700 dark:text-rose-400",
    activeBorder: "bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/30",
  },
};

export default function StatCard({
  label,
  value,
  unit,
  subtext,
  icon: Icon,
  variant = "default",
  isActive = false,
  onClick,
  isLoading = false,
}: StatCardProps) {
  const ui = useUiText();

  const styles = VARIANT_STYLES[variant];
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`p-4 sm:p-5 rounded-2xl border transition text-start w-full flex flex-col justify-between ${
        onClick ? "cursor-pointer" : ""
      } ${
        isActive
          ? styles.activeBorder
          : "theme-card theme-border hover:border-amber-500/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[var(--text-muted)] dark:text-slate-400 truncate">
          {ui(label)}
        </span>
        {Icon && (
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg}`}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <bdi
          dir="ltr"
          className={`text-xl sm:text-2xl lg:text-3xl font-semibold font-mono tracking-tight ${styles.textVal}`}
        >
          {ui(isLoading ? "—" : value)}
        </bdi>
        {unit && (
          <span className="text-xs font-bold text-[var(--text-muted)]">{ui(unit)}</span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{ui(subtext)}</p>
      )}
    </Component>
  );
}

export interface StatRowProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | number;
  className?: string;
}

export function StatRow({ children, columns = 4, className = "" }: StatRowProps) {
  const ui = useUiText();

  const colClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid ${colClass} gap-3 sm:gap-4 ${className}`.trim()}>
      {ui(children)}
    </div>
  );
}
