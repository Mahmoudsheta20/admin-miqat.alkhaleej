"use client";

import type { ReactNode } from "react";
import { ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MobileCollapsibleSectionProps {
  stepNumber?: number;
  title: string;
  summary?: string;
  icon?: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  hasError?: boolean;
  isComplete?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Accessible mobile accordion built on shadcn Card.
 * On md+ desktop viewports, all children remain expanded so multi-section desktop layout is preserved.
 * Uses `<button>` inside a semantic heading (`<h2>`), keeping hidden fields mounted for RHF validation.
 */
export function MobileCollapsibleSection({
  stepNumber,
  title,
  summary,
  icon,
  isOpen,
  onToggle,
  hasError = false,
  isComplete = false,
  children,
  className,
}: MobileCollapsibleSectionProps) {
  return (
    <Card
      className={cn(
        "theme-card border theme-border shadow-none overflow-hidden",
        hasError && "border-rose-500/40",
        className
      )}
    >
      <CardHeader className="p-0 md:hidden">
        <h2 className="m-0">
          <button
            type="button"
            aria-expanded={isOpen}
            onClick={onToggle}
            className="w-full min-h-14 px-4 py-3 flex items-center justify-between gap-3 text-start cursor-pointer hover:bg-[var(--bg-card-subtle)] transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {typeof stepNumber === "number" ? (
                <span
                  className={cn(
                    "w-8 h-8 rounded-lg text-sm font-mono font-bold flex items-center justify-center shrink-0 border",
                    hasError
                      ? "bg-rose-500/12 border-rose-600/35 text-rose-800 dark:text-rose-300"
                      : isComplete
                        ? "bg-emerald-500/12 border-emerald-600/35 text-emerald-800 dark:bg-emerald-950/45 dark:border-emerald-500/35 dark:text-emerald-300"
                        : isOpen
                          ? "bg-[var(--accent-surface)] border-[var(--accent-gold)]/45 text-[var(--accent-gold)]"
                          : "bg-[var(--bg-card-subtle)] theme-border text-[var(--text-muted)]"
                  )}
                >
                  {hasError ? (
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  ) : isComplete && !isOpen ? (
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    stepNumber
                  )}
                </span>
              ) : (
                icon
              )}
              <div className="min-w-0">
                <span className="block text-base font-semibold text-[var(--text-main)] truncate">
                  {title}
                </span>
                {summary && !isOpen && (
                  <span className="block text-sm text-[var(--text-muted)] truncate mt-0.5">
                    {summary}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasError && (
                <Badge variant="destructive" className="text-xs">
                  !
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-[var(--text-muted)] transition-transform duration-150",
                  isOpen && "rotate-180 text-[var(--accent-gold)]"
                )}
                aria-hidden="true"
              />
            </div>
          </button>
        </h2>
      </CardHeader>

      <CardContent className={cn("p-0", isOpen ? "block border-t theme-border md:border-t-0" : "hidden md:block")}>
        {children}
      </CardContent>
    </Card>
  );
}
