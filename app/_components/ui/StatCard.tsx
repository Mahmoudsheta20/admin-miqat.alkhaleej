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
    iconBg: "bg-[var(--bg-card-subtle)] text-[var(--text-main)]",
    textVal: "text-[var(--text-main)]",
    activeBorder: "bg-[var(--bg-card-subtle)] border-[var(--accent-gold)]/55 ring-1 ring-[var(--accent-gold)]/30",
  },
  amber: {
    iconBg: "bg-[var(--accent-surface)] text-[var(--accent-gold)]",
    textVal: "text-[var(--accent-gold)]",
    activeBorder: "bg-[var(--accent-surface)] border-[var(--accent-gold)]/55 ring-1 ring-[var(--accent-gold)]/30",
  },
  emerald: {
    iconBg: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
    textVal: "text-emerald-800 dark:text-emerald-300",
    activeBorder: "bg-emerald-500/10 border-emerald-600/45 ring-1 ring-emerald-600/30",
  },
  blue: {
    iconBg: "bg-sky-500/12 text-sky-800 dark:text-sky-300",
    textVal: "text-sky-800 dark:text-sky-300",
    activeBorder: "bg-sky-500/10 border-sky-600/45 ring-1 ring-sky-600/30",
  },
  purple: {
    iconBg: "bg-indigo-500/12 text-indigo-800 dark:text-indigo-300",
    textVal: "text-indigo-800 dark:text-indigo-300",
    activeBorder: "bg-indigo-500/10 border-indigo-600/45 ring-1 ring-indigo-600/30",
  },
  rose: {
    iconBg: "bg-rose-500/12 text-rose-800 dark:text-rose-300",
    textVal: "text-rose-800 dark:text-rose-300",
    activeBorder: "bg-rose-500/10 border-rose-600/45 ring-1 ring-rose-600/30",
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
          : "theme-card theme-border hover:border-[var(--accent-gold)]/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[var(--text-muted)] truncate">
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
