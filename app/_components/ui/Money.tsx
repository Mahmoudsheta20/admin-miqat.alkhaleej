"use client";

import React from "react";
import { useLanguage } from "@/lib/languageContext";

export interface MoneyProps {
  amount: number | string | null | undefined;
  currency?: string;
  showCurrency?: boolean;
  className?: string;
  negative?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "default" | "muted" | "rose" | "emerald" | "amber";
}

const SIZE_STYLES = {
  xs: "text-xs",
  sm: "text-sm font-bold",
  md: "text-base font-bold",
  lg: "text-lg sm:text-xl font-black",
  xl: "text-2xl sm:text-3xl font-black",
};

const COLOR_STYLES = {
  default: "text-slate-900 dark:text-white",
  muted: "text-slate-600 dark:text-slate-400 font-medium",
  rose: "text-rose-600 dark:text-rose-400 font-bold",
  emerald: "text-emerald-600 dark:text-emerald-400 font-bold",
  amber: "text-amber-600 dark:text-amber-400 font-bold",
};

export function formatMoneyValue(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return "0.00";
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Money({
  amount,
  currency,
  showCurrency = true,
  className = "",
  negative = false,
  size,
  color,
}: MoneyProps) {
  const { t } = useLanguage();
  const curr = currency || t("common.sar");
  const formatted = formatMoneyValue(amount);
  const isNegative = negative || (typeof amount === "number" && amount < 0);

  const sizeClass = size ? SIZE_STYLES[size] : "";
  const colorClass = color ? COLOR_STYLES[color] : "";

  return (
    <span className={`inline-flex items-baseline gap-1 font-mono ${colorClass} ${sizeClass} ${className}`.trim()}>
      <bdi dir="ltr">
        {isNegative && !formatted.startsWith("-") ? `-${formatted}` : formatted}
      </bdi>
      {showCurrency && (
        <span className="text-[11px] font-sans font-bold text-amber-600 dark:text-amber-400">
          {curr}
        </span>
      )}
    </span>
  );
}
