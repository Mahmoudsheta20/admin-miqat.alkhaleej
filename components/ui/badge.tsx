import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/55 dark:focus-visible:ring-amber-400/55",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--text-main)] text-[var(--bg-card)]",
        secondary:
          "border-[var(--border-color)] bg-[var(--bg-card-subtle)] text-[var(--text-main)]",
        destructive:
          "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-200",
        outline: "border border-[var(--control-border)] text-[var(--text-main)]",
        gold: "border-amber-600/35 bg-[var(--accent-surface)] text-[var(--accent-gold)]",
        success:
          "border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:text-emerald-300",
        warning:
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

