"use client";
import { useUiText } from "@/lib/ui-text";



import { useLanguage } from "@/lib/languageContext";
import { signedMoneyMinor } from "@/lib/dashboard-analytics";

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
  lg: "text-lg sm:text-xl font-semibold",
  xl: "text-2xl sm:text-3xl font-semibold",
};

const COLOR_STYLES = {
  default: "text-slate-900 dark:text-white",
  muted: "text-[var(--text-muted)] dark:text-slate-400 font-medium",
  rose: "text-rose-700 dark:text-rose-400 font-bold",
  emerald: "text-emerald-700 dark:text-emerald-400 font-bold",
  amber: "text-[var(--text-muted)] font-bold",
};

function addGroupingCommas(wholeDigits: string): string {
  return wholeDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatMoneyValue(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return "0.00";
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^[+-]?\d+(?:\.\d{1,2})?$/.test(trimmed)) {
      const minor = signedMoneyMinor(trimmed);
      const negative = minor < BigInt(0);
      const abs = negative ? -minor : minor;
      const whole = addGroupingCommas((abs / BigInt(100)).toString());
      const frac = (abs % BigInt(100)).toString().padStart(2, "0");
      return `${negative ? "-" : ""}${whole}.${frac}`;
    }
  }
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
  const ui = useUiText();

  const { t } = useLanguage();
  const curr = currency || t("common.sar");
  const formatted = formatMoneyValue(amount);
  const isNegative = negative || formatted.startsWith("-");
  const display = isNegative && !formatted.startsWith("-") ? `-${formatted}` : formatted;

  const sizeClass = size ? SIZE_STYLES[size] : "";
  const colorClass = color ? COLOR_STYLES[color] : "";

  return (
    <span className={`inline-flex items-baseline gap-1 font-mono ${colorClass} ${sizeClass} ${className}`.trim()}>
      <bdi dir="ltr">{display}</bdi>
      {showCurrency && (
        <span className="text-xs font-sans font-bold text-[var(--text-muted)]">
          {ui(curr)}
        </span>
      )}
    </span>
  );
}
