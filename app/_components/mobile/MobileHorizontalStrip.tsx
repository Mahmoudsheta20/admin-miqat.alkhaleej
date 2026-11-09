"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MobileHorizontalStripProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

/**
 * Snap-scrolling horizontal rail for chips, quick navigation shortcuts, and compact step pills on mobile.
 * Preserves pan-y scrolling so vertical page drags never lock when touching the strip.
 */
export function MobileHorizontalStrip({ children, label, className }: MobileHorizontalStripProps) {
  return (
    <div
      role={label ? "region" : undefined}
      aria-label={label}
      className={cn(
        "flex items-stretch gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory touch-pan-x touch-pan-y pb-1",
        className
      )}
    >
      {children}
    </div>
  );
}

