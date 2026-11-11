import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50",
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/55 dark:focus-visible:ring-emerald-400/55",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
          "border-transparent bg-[var(--text-main)] text-[var(--bg-card)]",
        secondary:
          "border-transparent bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
          "border-[var(--border-color)] bg-[var(--bg-card-subtle)] text-[var(--text-main)]",
        destructive:
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400",
        outline: "border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200",
        gold: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300",
          "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-200",
        outline: "border border-[var(--control-border)] text-[var(--text-main)]",
        gold: "border-amber-600/35 bg-[var(--accent-surface)] text-[var(--accent-gold)]",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
          "border-emerald-600/35 bg-[var(--brand-green-surface)] text-[var(--brand-green)]",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
          "border-amber-600/35 bg-[var(--accent-surface)] text-[var(--accent-gold)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

